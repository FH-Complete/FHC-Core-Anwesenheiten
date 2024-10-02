<?php

class Anwesenheit_model extends \DB_Model
{

	/**
	 * Constructor
	 */
	public function __construct()
	{
		parent::__construct();
		$this->dbTable = 'extension.tbl_anwesenheit';
		$this->pk = 'anwesenheit_id';

	}

	public function isPersonAttendingLehreinheit($le_id, $uid) {
		$query = "
			SELECT prestudent_id FROM lehre.tbl_lehreinheit
				JOIN campus.vw_student_lehrveranstaltung USING (lehreinheit_id)
				JOIN tbl_student ON (tbl_student.student_uid = campus.vw_student_lehrveranstaltung.uid)
				JOIN tbl_prestudent USING (prestudent_id)
			WHERE lehreinheit_id = ? AND uid = ?;
		";

		return $this->execQuery($query, [$le_id, $uid]);
	}

	public function getKontrolleForLEOnDate($le_id, $date) {
		$query = "
			SELECT * FROM extension.tbl_anwesenheit
			WHERE DATE(von) = '{$date->year}-{$date->month}-{$date->day}'
			AND lehreinheit_id = ?
		";

		return $this->execQuery($query, [$le_id]);
	}

	public function getKontrollenForLeId($le_id) {
		$query = "
			SELECT anwesenheit_id, lehreinheit_id, TO_CHAR(CAST(von AS DATE), 'DD.MM.YYYY') AS datum, CAST(von AS TIME) AS von, CAST(bis AS TIME) AS bis
			FROM extension.tbl_anwesenheit
			WHERE lehreinheit_id =  ?
			ORDER BY datum DESC
		";

		return $this->execQuery($query, [$le_id]);
	}

	public function getKontrollenForLeIdAndInterval($le_id, $days) {
		$query = "
			SELECT anwesenheit_id, lehreinheit_id, TO_CHAR(CAST(von AS DATE), 'DD.MM.YYYY') AS datum, CAST(von AS TIME) AS von, CAST(bis AS TIME) AS bis
			FROM extension.tbl_anwesenheit
			WHERE lehreinheit_id =  ? AND von > (NOW() - INTERVAL '{$days} days')
			ORDER BY datum DESC
		";

		return $this->execQuery($query, [$le_id]);
	}

	public function getStudentsForLVAandLEandSemester($lv_id, $le_id, $sem_kurzbz, $root) {
		$query = "SELECT
				distinct on(nachname, vorname, person_id) vorname, nachname, prestudent_id, person_id,
				    CONCAT(?, 'cis/public/bild.php?src=person&person_id=') || person_id as foto   
				    , campus.vw_student_lehrveranstaltung.studiensemester_kurzbz,
			   campus.vw_student_lehrveranstaltung.lehreinheit_id, campus.vw_student_lehrveranstaltung.lehrveranstaltung_id,
			   tbl_studentlehrverband.semester, tbl_studentlehrverband.verband, tbl_studentlehrverband.gruppe,
			   	extension.get_anwesenheiten_by_time(prestudent_id, $lv_id, campus.vw_student_lehrveranstaltung.studiensemester_kurzbz) as sum,
			   (SELECT status_kurzbz FROM public.tbl_prestudentstatus
				WHERE prestudent_id=tbl_student.prestudent_id
				ORDER BY datum DESC, insertamum DESC, ext_id DESC LIMIT 1) as studienstatus,
			     tbl_bisio.bisio_id, tbl_bisio.von, tbl_bisio.bis, tbl_student.studiengang_kz AS stg_kz_student,
			   tbl_note.lkt_ueberschreibbar, tbl_note.anmerkung, tbl_mitarbeiter.mitarbeiter_uid, tbl_person.matr_nr, tbl_person.geschlecht, tbl_studiengang.kurzbzlang,
			   tbl_mobilitaet.mobilitaetstyp_kurzbz, tbl_zeugnisnote.note,
			   (CASE WHEN bis.tbl_mobilitaet.studiensemester_kurzbz = vw_student_lehrveranstaltung.studiensemester_kurzbz THEN 1 ELSE 0 END) as doubledegree
			
			 FROM
				 campus.vw_student_lehrveranstaltung
					 JOIN public.tbl_benutzer USING(uid)
					 JOIN public.tbl_person USING(person_id)
					 LEFT JOIN public.tbl_student ON(uid=student_uid)
					 LEFT JOIN public.tbl_mitarbeiter ON(uid=mitarbeiter_uid)
					 LEFT JOIN public.tbl_studentlehrverband USING(student_uid,studiensemester_kurzbz)
				     LEFT JOIN lehre.tbl_zeugnisnote on(vw_student_lehrveranstaltung.lehrveranstaltung_id=tbl_zeugnisnote.lehrveranstaltung_id
						AND tbl_zeugnisnote.student_uid=tbl_student.student_uid
						AND tbl_zeugnisnote.studiensemester_kurzbz=tbl_studentlehrverband.studiensemester_kurzbz)
					LEFT JOIN lehre.tbl_note USING (note)
					LEFT JOIN bis.tbl_bisio ON(uid=tbl_bisio.student_uid)
					LEFT JOIN public.tbl_studiengang ON(tbl_student.studiengang_kz=tbl_studiengang.studiengang_kz)
			 		LEFT JOIN bis.tbl_mobilitaet USING(prestudent_id)
			 WHERE
				 vw_student_lehrveranstaltung.lehrveranstaltung_id=?	AND
				 vw_student_lehrveranstaltung.studiensemester_kurzbz=? AND 
				 vw_student_lehrveranstaltung.lehreinheit_id=?";

		return $this->execReadOnlyQuery($query, [$root, $lv_id, $sem_kurzbz, $le_id]);
	}

	public function getStudentsForLvaInSemester($lv_id, $sem_kurzbz) {
		$query = "SELECT
				distinct on(semester, verband, gruppe, nachname, vorname, person_id) vorname, nachname, prestudent_id, person_id, uid
				    , campus.vw_student_lehrveranstaltung.studiensemester_kurzbz,
			   campus.vw_student_lehrveranstaltung.lehreinheit_id, campus.vw_student_lehrveranstaltung.lehrveranstaltung_id,
			   tbl_studentlehrverband.semester, tbl_studentlehrverband.verband, tbl_studentlehrverband.gruppe
			
			 FROM
				 campus.vw_student_lehrveranstaltung
					 JOIN public.tbl_benutzer USING(uid)
					 JOIN public.tbl_person USING(person_id)
					 LEFT JOIN public.tbl_student ON(uid=student_uid)
					 LEFT JOIN public.tbl_mitarbeiter ON(uid=mitarbeiter_uid)
					 LEFT JOIN public.tbl_studentlehrverband USING(student_uid,studiensemester_kurzbz)
			 WHERE
				 vw_student_lehrveranstaltung.lehrveranstaltung_id=?	AND
				 vw_student_lehrveranstaltung.studiensemester_kurzbz=?
			ORDER BY semester, verband, gruppe, nachname;";

		return $this->execReadOnlyQuery($query, [$lv_id, $sem_kurzbz]);
	}

	public function getStudentViewData($uid) {
		$query = "SELECT vorname, nachname, prestudent_id, public.tbl_person.person_id, student_uid, semester, verband, gruppe
					FROM public.tbl_person
						JOIN public.tbl_prestudent ON (public.tbl_person.person_id = public.tbl_prestudent.person_id)
						JOIN public.tbl_student USING (prestudent_id, studiengang_kz)
					WHERE public.tbl_student.student_uid = ?;";

		return $this->execReadOnlyQuery($query, [$uid]);
	}

	public function loadEmptyAnwesenheitenForLE($le_ids) {
		$qry="SELECT anwesenheit_id, von, bis, lehreinheit_id
		FROM extension.tbl_anwesenheit
			LEFT JOIN extension.tbl_anwesenheit_user USING (anwesenheit_id)
			WHERE tbl_anwesenheit_user.anwesenheit_user_id IS NULL AND lehreinheit_id IN ?;";

		return $this->execQuery($qry, [$le_ids]);
	}

	public function getAnwesenheitenEntriesForStudents($prestudentIds, $le_id) {
		$query = "
			SELECT
				anwesenheit_user_id,
				prestudent_id,
				ta.anwesenheit_id,
				DATE(ta.von) as datum,
				extension.tbl_anwesenheit_user.status
			FROM extension.tbl_anwesenheit_user JOIN extension.tbl_anwesenheit ta on ta.anwesenheit_id = tbl_anwesenheit_user.anwesenheit_id
			WHERE prestudent_id IN ? AND ta.lehreinheit_id = ?;";


		return $this->execReadOnlyQuery($query, [$prestudentIds, $le_id]);
	}

	public function getLETermine($le_id) {
		$query = "SELECT datum, MIN(beginn) as beginn, MAX(ende) as ende
				FROM lehre.vw_stundenplan JOIN lehre.tbl_stunde USING(stunde)
				WHERE lehreinheit_id = ?
				GROUP BY datum
				ORDER BY datum ASC";

		return $this->execReadOnlyQuery($query, [$le_id]);
	}

	public function getAllAnwesenheitenByLva($lv_id, $sem_kurzbz) {
		$query ="
		SELECT
			extension.tbl_anwesenheit_user.status,
			ta.von, ta.bis
		FROM
			extension.tbl_anwesenheit_user JOIN extension.tbl_anwesenheit ta on ta.anwesenheit_id = tbl_anwesenheit_user.anwesenheit_id
			JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
		WHERE studiensemester_kurzbz = ? AND lehrveranstaltung_id = ?";

		return $this->execQuery($query, [$sem_kurzbz, $lv_id]);
	}

	public function getAllPersonIdsForLE($le_id)
	{
		$query = "
			SELECT person_id, prestudent_id FROM lehre.tbl_lehreinheit
				JOIN campus.vw_student_lehrveranstaltung USING (lehreinheit_id)
				JOIN tbl_student ON (tbl_student.student_uid = campus.vw_student_lehrveranstaltung.uid)
				JOIN tbl_prestudent USING (prestudent_id)
			WHERE lehreinheit_id = ?;
		";

		return $this->execQuery($query, [$le_id]);
	}

	public function getAllAnwesenheitenByLehreinheitByDate($le_id, $date)
	{
		$query = "
			SELECT *
			FROM extension.tbl_anwesenheit_user JOIN extension.tbl_anwesenheit USING (anwesenheit_id)
			WHERE lehreinheit_id = ? AND DATE(extension.tbl_anwesenheit.von) = ?
			ORDER BY von ASC;
		";

		return $this->execQuery($query, [$le_id, $date]);
	}

	public function getLehreinheitAndLektorInfo($le_id, $ma_uid, $date)
	{
		$query = "
			SELECT DISTINCT * FROM 
				(
					SELECT tbl_lehreinheit.lehrveranstaltung_id, tbl_lehreinheit.lehreinheit_id, bezeichnung, kurzbz
					FROM lehre.tbl_lehrveranstaltung JOIN lehre.tbl_lehreinheit USING (lehrveranstaltung_id)
					WHERE lehreinheit_id = ?
				) le LEFT JOIN
				(
					SELECT mitarbeiter_uid, beginn, ende, lehreinheit_id
					FROM lehre.tbl_stundenplan JOIN lehre.tbl_stunde USING(stunde)
					WHERE mitarbeiter_uid = ?
						AND datum = ?
				)	sp USING (lehreinheit_id);
		";

		return $this->execQuery($query, [$le_id, $ma_uid, $date]);

	}

	public function getStundenPlanEntriesForLEandLektorOnDate($le_id, $ma_uid, $date) {
		$query = "SELECT Distinct mitarbeiter_uid, beginn, ende, lehreinheit_id
			FROM lehre.tbl_stundenplan JOIN lehre.tbl_stunde USING(stunde)
			WHERE mitarbeiter_uid = ?
			AND datum = ? AND lehreinheit_id = ?";

		return $this->execReadOnlyQuery($query, [$ma_uid, $date, $le_id]);
	}

	public function getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz, $root)
	{
		$query = "
			SELECT vorname, nachname, 
			      CONCAT(?, 'cis/public/bild.php?src=person&person_id=') || person_id as foto,
			    semester, verband, gruppe, extension.get_anwesenheiten_by_time(?, ?, ?) as sum
			FROM public.tbl_benutzer
					 JOIN public.tbl_person USING(person_id)
					 LEFT JOIN public.tbl_student ON(uid=student_uid)
			WHERE prestudent_id = ?;
			
		";

		return $this->execQuery($query, [$root, $prestudent_id, $lva_id, $sem_kurzbz, $prestudent_id]);
	}

	public function getAllByStudent($student, $studiensemester)
	{
		$query = '
			SELECT tbl_lehrveranstaltung.bezeichnung,
				tbl_anwesenheit_status.status_kurzbz as student_status,
				(tbl_anwesenheit.von) as von,
				(tbl_anwesenheit.bis) as bis,
				extension.get_anwesenheiten_by_time(tbl_anwesenheit_user.prestudent_id, tbl_lehrveranstaltung.lehrveranstaltung_id, tbl_lehreinheit.studiensemester_kurzbz) as anwesenheit
			FROM extension.tbl_anwesenheit
				JOIN extension.tbl_anwesenheit_user ON tbl_anwesenheit.anwesenheit_id = tbl_anwesenheit_user.anwesenheit_id
				JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
				JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
				JOIN public.tbl_prestudent ON tbl_anwesenheit_user.prestudent_id = tbl_prestudent.prestudent_id
				JOIN public.tbl_person ON tbl_prestudent.person_id = tbl_person.person_id
				JOIN public.tbl_benutzer ON tbl_person.person_id = tbl_benutzer.person_id
				JOIN extension.tbl_anwesenheit_status ON tbl_anwesenheit_user.status = tbl_anwesenheit_status.status_kurzbz
			WHERE tbl_benutzer.uid = ? AND tbl_lehreinheit.studiensemester_kurzbz = ?
			ORDER BY tbl_lehrveranstaltung.bezeichnung, von DESC, bis DESC;
		';

		return $this->execReadOnlyQuery($query, array($student, $studiensemester));
	}

	public function updateAnwesenheiten($anwesenheiten_user_ids, $updateStatus) {
		$query='INSERT INTO extension.tbl_anwesenheit_user_history (
			anwesenheit_user_id,
			anwesenheit_id,
			prestudent_id,
			status,
			statussetvon,
			statussetamum,
			notiz,
			version,
			insertamum,
			insertvon,
			updateamum,
			updatevon
		) SELECT 
		    anwesenheit_user_id,
			anwesenheit_id,
			prestudent_id,
			status,
			statussetvon,
			statussetamum,
			notiz,
			version,
			insertamum,
			insertvon,
			updateamum,
			updatevon
			FROM extension.tbl_anwesenheit_user
			WHERE anwesenheit_user_id IN ?';

		$this->execQuery($query, [$anwesenheiten_user_ids]);

		$query = 'UPDATE extension.tbl_anwesenheit_user SET status = ?, version = version +1
					WHERE anwesenheit_user_id IN ?';
		$resultUpdate = $this->execQuery($query, [$updateStatus, $anwesenheiten_user_ids]);

		return $resultUpdate;
	}

	public function getAllLehreinheitenForLvaAndMaUid($lva_id, $ma_uid, $sem_kurzbz) {
		$query = "SELECT DISTINCT tbl_lehreinheitmitarbeiter.lehreinheit_id, tbl_lehreinheit.lehrveranstaltung_id, tbl_lehreinheit.lehrform_kurzbz,
						tbl_lehreinheitmitarbeiter.mitarbeiter_uid, 
						tbl_lehreinheitgruppe.studiengang_kz, 
						tbl_lehreinheitgruppe.semester, 
						tbl_lehreinheitgruppe.verband, 
						tbl_lehreinheitgruppe.gruppe, 
						tbl_lehreinheitgruppe.gruppe_kurzbz,
						tbl_lehrveranstaltung.kurzbz,
			 			tbl_studiengang.kurzbzlang
		FROM lehre.tbl_lehreinheit JOIN lehre.tbl_lehreinheitmitarbeiter USING(lehreinheit_id)
			JOIN lehre.tbl_lehreinheitgruppe USING(lehreinheit_id)
			JOIN lehre.tbl_lehrveranstaltung USING(lehrveranstaltung_id)
			JOIN public.tbl_studiengang ON (tbl_lehreinheitgruppe.studiengang_kz = tbl_studiengang.studiengang_kz)
		WHERE lehrveranstaltung_id = ? AND studiensemester_kurzbz = ? AND mitarbeiter_uid = ?
		ORDER BY tbl_lehreinheitgruppe.gruppe_kurzbz";

		return $this->execQuery($query, [$lva_id, $sem_kurzbz, $ma_uid]);
	}

	public function getAllLehreinheitenForLva($lva_id, $sem_kurzbz) {
		$query = "SELECT DISTINCT ON (tbl_stundenplan.lehreinheit_id) tbl_stundenplan.lehreinheit_id, tbl_lehreinheit.lehrveranstaltung_id, tbl_lehreinheit.lehrform_kurzbz,
				tbl_stundenplan.mitarbeiter_uid, studiengang_kz, semester, verband, gruppe, gruppe_kurzbz
				FROM lehre.tbl_lehreinheit LEFT JOIN lehre.tbl_stundenplan USING(lehreinheit_id)
				WHERE lehrveranstaltung_id = ? AND studiensemester_kurzbz = ? AND tbl_stundenplan.lehreinheit_id IS NOT NULL";

		return $this->execQuery($query, [$lva_id, $sem_kurzbz]);
	}

	public function getCheckInCountsForAnwesenheitId($anwesenheit_id) {
		$query = "SELECT (SELECT COUNT(*)
			FROM extension.tbl_anwesenheit_user
			LEFT JOIN extension.tbl_anwesenheit USING(anwesenheit_id)
			WHERE anwesenheit_id = ? AND status = 'anwesend') as anwesend,
		(SELECT COUNT(*)
			FROM extension.tbl_anwesenheit_user
			LEFT JOIN extension.tbl_anwesenheit USING(anwesenheit_id)
			WHERE anwesenheit_id = ? AND status = 'abwesend') as abwesend,
		(SELECT COUNT(*)
				FROM extension.tbl_anwesenheit_user
				LEFT JOIN extension.tbl_anwesenheit USING(anwesenheit_id)
				WHERE anwesenheit_id = ? AND status = 'entschuldigt') as entschuldigt;";

		return $this->execQuery($query, [$anwesenheit_id, $anwesenheit_id, $anwesenheit_id]);
	}

	public function getStudiengaenge() {
		$query ="SELECT DISTINCT
					public.tbl_studiengang.studiengang_kz,
					public.tbl_studiengang.bezeichnung,
					public.tbl_studiengang.kurzbzlang,
					public.tbl_studiengang.orgform_kurzbz
				FROM public.tbl_studiengang JOIN lehre.tbl_studienordnung USING(studiengang_kz)
					JOIN lehre.tbl_studienplan USING(studienordnung_id)
					JOIN lehre.tbl_studienplan_semester USING(studienplan_id)
				WHERE public.tbl_studiengang.aktiv = true
				ORDER BY public.tbl_studiengang.kurzbzlang";

		return $this->execReadOnlyQuery($query);
	}

	public function getStudiengaengeFiltered($allowed_stg)
	{
		$query ="SELECT DISTINCT
					public.tbl_studiengang.studiengang_kz,
					public.tbl_studiengang.bezeichnung,
					public.tbl_studiengang.kurzbzlang,
					public.tbl_studiengang.orgform_kurzbz
				FROM public.tbl_studiengang JOIN lehre.tbl_studienordnung USING(studiengang_kz)
					JOIN lehre.tbl_studienplan USING(studienordnung_id)
					JOIN lehre.tbl_studienplan_semester USING(studienplan_id)
				WHERE public.tbl_studiengang.aktiv = true
				
				AND public.tbl_studiengang.studiengang_kz IN ?
				ORDER BY public.tbl_studiengang.kurzbzlang";

		return $this->execReadOnlyQuery($query, [$allowed_stg]);
	}

	public function getAllAnwesenheitenByStudiengang($stg_kz, $sem_kurzbz) {
		$query ="SELECT
			extension.tbl_anwesenheit_user.status
		FROM
			(SELECT
				prestudent_id
			 FROM
				public.tbl_studentlehrverband
				JOIN public.tbl_student USING(student_uid)
				JOIN public.tbl_prestudent USING(prestudent_id)
			 WHERE
				tbl_student.studiengang_kz = ?
				AND tbl_studentlehrverband.studiensemester_kurzbz = ?) students
			JOIN extension.tbl_anwesenheit_user USING(prestudent_id)
			JOIN extension.tbl_anwesenheit ta on ta.anwesenheit_id = tbl_anwesenheit_user.anwesenheit_id";

		return $this->execReadOnlyQuery($query, [$stg_kz, $sem_kurzbz]);
	}

	public function getLektorIsTeachingLE($le_id, $ma_uid) {
		$query = "SELECT COUNT(*) > 0
			FROM lehre.tbl_lehreinheitmitarbeiter
			WHERE lehreinheit_id = ? AND mitarbeiter_uid = ?";

		return $this->execReadOnlyQuery($query, [$le_id, $ma_uid]);
	}

	public function getLektorenForLvaInSemester($lva_id, $sem_kurzbz) {
		$query = "SELECT DISTINCT (mitarbeiter_uid), anrede, titelpre, vorname, vornamen, nachname, titelpost
			FROM lehre.tbl_lehreinheit JOIN lehre.tbl_lehreinheitmitarbeiter USING (lehreinheit_id)
			JOIN public.tbl_benutzer ON (public.tbl_benutzer.uid = lehre.tbl_lehreinheitmitarbeiter.mitarbeiter_uid)
			JOIN public.tbl_person USING (person_id)
			WHERE lehre.tbl_lehreinheit.lehrveranstaltung_id = ? 
			  AND lehre.tbl_lehreinheit.studiensemester_kurzbz = ?;";

		return $this->execReadOnlyQuery($query, [$lva_id, $sem_kurzbz]);
	}

	public function getLvViewDataInfo($lv_id){
		$query = "SELECT lehrveranstaltung_id, kurzbz, bezeichnung, orgform_kurzbz, lehrtyp_kurzbz, oe_kurzbz, raumtyp_kurzbz, benotung
			FROM lehre.tbl_lehrveranstaltung
			WHERE lehre.tbl_lehrveranstaltung.lehrveranstaltung_id = ?;";

		return $this->execReadOnlyQuery($query, [$lv_id]);
	}

	public function loadLEForSemester($sem) {

		$query = "SELECT lehreinheit_id FROM lehre.tbl_lehreinheit WHERE studiensemester_kurzbz = ?;";

		return $this->execReadOnlyQuery($query, [$sem]);
	}

	public function getRandomStudentPersonIDS() {
		$qry = "SELECT person_id
				FROM tbl_person JOIN tbl_prestudent USING (person_id)
				WHERE tbl_person.insertamum > '2021-10-10 10:10:10.000000'
				ORDER BY RANDOM()
				LIMIT 25000;";

		return $this->execReadOnlyQuery($qry);
	}

	public function getAllLvaWithLEForSgAndSem($sg, $sem) {
		$qry = "SELECT DISTINCT ON (lehre.tbl_lehreinheit.lehrveranstaltung_id, lehreinheit_id) lehreinheit_id, lehre.tbl_lehreinheit.lehrveranstaltung_id
				FROM lehre.vw_stundenplan JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
				WHERE studiengang_kz = ? AND studiensemester_kurzbz = ?;";

		return $this->execReadOnlyQuery($qry, [$sg, $sem]);

	}

}