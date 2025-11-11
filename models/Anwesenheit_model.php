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

	public function isPersonAttendingLehreinheit($le_id, $uid)
	{
		$query = "
			SELECT prestudent_id FROM lehre.tbl_lehreinheit
				JOIN campus.vw_student_lehrveranstaltung USING (lehreinheit_id)
				JOIN tbl_student ON (tbl_student.student_uid = campus.vw_student_lehrveranstaltung.uid)
				JOIN tbl_prestudent USING (prestudent_id)
			WHERE lehreinheit_id = ? AND uid = ?;
		";

		return $this->execQuery($query, [$le_id, $uid]);
	}

	public function getKontrolleForLEOnDate($le_id, $date)
	{
		$query = "
			SELECT * FROM extension.tbl_anwesenheit
			WHERE DATE(von) = ?
			AND lehreinheit_id = ?
		";

		return $this->execQuery($query, [$date, $le_id]);
	}

	public function getKontrollenForLeId($le_id)
	{
		$query = "
			SELECT anwesenheit_id, lehreinheit_id, TO_CHAR(CAST(von AS DATE), 'DD.MM.YYYY') AS datum, CAST(von AS TIME) AS von, CAST(bis AS TIME) AS bis,
				   COUNT(*) FILTER (WHERE status = 'anwesend') AS anwesend,
				   COUNT(*) FILTER (WHERE status = 'abwesend') AS abwesend,
				   COUNT(*) FILTER (WHERE status = 'entschuldigt') AS entschuldigt,
				   extension.tbl_anwesenheit.insertvon, extension.tbl_anwesenheit.insertamum,
				   extension.tbl_anwesenheit.updatevon, extension.tbl_anwesenheit.updateamum
			FROM extension.tbl_anwesenheit JOIN extension.tbl_anwesenheit_user USING(anwesenheit_id)
			WHERE lehreinheit_id =  ?
			GROUP BY (anwesenheit_id, lehreinheit_id, datum, von, bis)
			ORDER BY MIN(von) DESC;
		";

		return $this->execQuery($query, [$le_id]);
	}

	public function getKontrollenForLeIdAndDate($le_id, $date)
	{
		$query = "
			SELECT anwesenheit_id, lehreinheit_id, TO_CHAR(CAST(von AS DATE), 'DD.MM.YYYY') AS datum, CAST(von AS TIME) AS von, CAST(bis AS TIME) AS bis,
				   COUNT(*) FILTER (WHERE status = 'anwesend') AS anwesend,
				   COUNT(*) FILTER (WHERE status = 'abwesend') AS abwesend,
				   COUNT(*) FILTER (WHERE status = 'entschuldigt') AS entschuldigt,
				   extension.tbl_anwesenheit.insertvon, extension.tbl_anwesenheit.insertamum,
				   extension.tbl_anwesenheit.updatevon, extension.tbl_anwesenheit.updateamum
			FROM extension.tbl_anwesenheit JOIN extension.tbl_anwesenheit_user USING(anwesenheit_id)
			WHERE lehreinheit_id =  ? AND TO_CHAR(CAST(von AS DATE), 'YYYY-MM-DD') = ?
			GROUP BY (anwesenheit_id, lehreinheit_id, datum, von, bis)
			ORDER BY MIN(von) DESC;
		";

		return $this->execQuery($query, [$le_id, $date]);
	}

	public function getStudentsForLVAandLEandSemester($lv_id, $le_id, $sem_kurzbz, $root)
	{
		$query = "SELECT
				distinct on(nachname, vorname, public.tbl_benutzer.person_id) vorname, nachname, prestudent_id, public.tbl_student.student_uid, public.tbl_benutzer.person_id,
				    CONCAT(?, 'cis/public/bild.php?src=person&person_id=') || public.tbl_benutzer.person_id as foto   
				    , campus.vw_student_lehrveranstaltung.studiensemester_kurzbz,
			   tbl_studentlehrverband.semester, tbl_studentlehrverband.verband, tbl_studentlehrverband.gruppe,
			   	extension.get_anwesenheiten_by_time(prestudent_id, $lv_id, campus.vw_student_lehrveranstaltung.studiensemester_kurzbz) as sum,
			   (SELECT status_kurzbz FROM public.tbl_prestudentstatus
				WHERE prestudent_id=tbl_student.prestudent_id
				ORDER BY datum DESC, insertamum DESC, ext_id DESC LIMIT 1) as studienstatus,
			   tbl_mitarbeiter.mitarbeiter_uid,
			   tbl_note.lkt_ueberschreibbar, tbl_note.anmerkung,
			   tbl_mobilitaet.mobilitaetstyp_kurzbz,
			   (CASE WHEN bis.tbl_mobilitaet.studiensemester_kurzbz = vw_student_lehrveranstaltung.studiensemester_kurzbz THEN 1 ELSE 0 END) as doubledegree,
			   public.tbl_prestudent.gsstudientyp_kurzbz as ddtype
			
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
			 		LEFT JOIN public.tbl_prestudent USING(prestudent_id)
			 WHERE
				 vw_student_lehrveranstaltung.lehrveranstaltung_id=?	AND
				 vw_student_lehrveranstaltung.studiensemester_kurzbz=? AND 
				 vw_student_lehrveranstaltung.lehreinheit_id=?";

		return $this->execReadOnlyQuery($query, [$root, $lv_id, $sem_kurzbz, $le_id]);
	}

	public function getStudentsForLvaInSemester($lv_id, $sem_kurzbz)
	{
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
			ORDER BY nachname, semester, verband, gruppe;";

		return $this->execReadOnlyQuery($query, [$lv_id, $sem_kurzbz]);
	}

	public function getStudentViewData($uid)
	{
		$query = "SELECT vorname, nachname, prestudent_id, public.tbl_person.person_id, student_uid, semester, verband, gruppe
					FROM public.tbl_person
						JOIN public.tbl_prestudent ON (public.tbl_person.person_id = public.tbl_prestudent.person_id)
						JOIN public.tbl_student USING (prestudent_id, studiengang_kz)
					WHERE public.tbl_student.student_uid = ?;";

		return $this->execReadOnlyQuery($query, [$uid]);
	}

	public function loadEmptyAnwesenheitenForLE($le_ids)
	{
		$qry="SELECT anwesenheit_id, von, bis, lehreinheit_id
		FROM extension.tbl_anwesenheit
			LEFT JOIN extension.tbl_anwesenheit_user USING (anwesenheit_id)
			WHERE tbl_anwesenheit_user.anwesenheit_user_id IS NULL AND lehreinheit_id IN ?;";

		return $this->execQuery($qry, [$le_ids]);
	}

	public function getAnwesenheitenEntriesForStudents($prestudentIds, $le_id)
	{
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

	public function getLETermine($le_id)
	{
		$query = "SELECT DISTINCT datum, beginn, ende, stunde
				FROM lehre.vw_stundenplan JOIN lehre.tbl_stunde USING(stunde)
				WHERE lehreinheit_id = ?
				ORDER BY datum ASC";

		return $this->execReadOnlyQuery($query, [$le_id]);
	}

	public function getAllAnwesenheitenByLva($lv_id, $sem_kurzbz)
	{
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

	public function getStundenPlanEntriesForLEandLektorOnDate($le_id, $ma_uid, $date)
	{
		$query = "SELECT DISTINCT mitarbeiter_uid, beginn, ende, lehreinheit_id
			FROM lehre.tbl_stundenplan JOIN lehre.tbl_stunde USING(stunde)
			WHERE mitarbeiter_uid = ?
			AND datum = ? AND lehreinheit_id = ?";

		return $this->execReadOnlyQuery($query, [$ma_uid, $date, $le_id]);
	}

	public function getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz, $root)
	{
		$query = "
			SELECT vorname, nachname,
			       person_id, prestudent_id,
			      CONCAT(?, 'cis/public/bild.php?src=person&person_id=') || person_id as foto,
			    semester, verband, gruppe, extension.get_anwesenheiten_by_time(?, ?, ?) as sum
			FROM public.tbl_benutzer
					 JOIN public.tbl_person USING(person_id)
					 LEFT JOIN public.tbl_student ON(uid=student_uid)
			WHERE prestudent_id = ?;
			
		";

		return $this->execQuery($query, [$root, $prestudent_id, $lva_id, $sem_kurzbz, $prestudent_id]);
	}

	// quota per lva
	public function getAllQuotasForLvaByStudent($student, $studiensemester)
	{
		$query = '
			SELECT DISTINCT tbl_lehrveranstaltung.bezeichnung,
			       lehrveranstaltung_id,
			       tbl_prestudent.prestudent_id,
				extension.get_anwesenheiten_by_time(tbl_anwesenheit_user.prestudent_id, tbl_lehrveranstaltung.lehrveranstaltung_id, tbl_lehreinheit.studiensemester_kurzbz) as anwesenheit
			FROM extension.tbl_anwesenheit
				JOIN extension.tbl_anwesenheit_user ON tbl_anwesenheit.anwesenheit_id = tbl_anwesenheit_user.anwesenheit_id
				JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
				JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
				JOIN public.tbl_prestudent ON tbl_anwesenheit_user.prestudent_id = tbl_prestudent.prestudent_id
				JOIN public.tbl_person ON tbl_prestudent.person_id = tbl_person.person_id
				JOIN public.tbl_benutzer ON tbl_person.person_id = tbl_benutzer.person_id
			WHERE tbl_benutzer.uid = ? AND tbl_lehreinheit.studiensemester_kurzbz = ?
			ORDER BY tbl_lehrveranstaltung.bezeichnung;
		';

		return $this->execReadOnlyQuery($query, array($student, $studiensemester));
	}
	
	// get all anw entries for student in semester
	public function getAllByStudent($student, $studiensemester)
	{
		$query = '
			SELECT tbl_lehrveranstaltung.bezeichnung,
			       tbl_lehrveranstaltung.bezeichnung_english,
			       lehrveranstaltung_id,
				tbl_anwesenheit_status.status_kurzbz as student_status,
				Date(tbl_anwesenheit.von) as datum,
				(tbl_anwesenheit.von) as von,
				(tbl_anwesenheit.bis) as bis,
				extension.get_anwesenheiten_by_time(tbl_anwesenheit_user.prestudent_id, tbl_lehrveranstaltung.lehrveranstaltung_id, tbl_lehreinheit.studiensemester_kurzbz) as anwesenheit,
				CAST(extension.get_epoch_from_anw_times(extension.tbl_anwesenheit.von, extension.tbl_anwesenheit.bis) / 60 AS INTEGER ) AS dauer
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

	public function updateAnwesenheiten($anwesenheiten_user_ids, $updateStatus)
	{
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

		$query = 'UPDATE extension.tbl_anwesenheit_user SET status = ?, version = version +1, updatevon = ?, updateamum = ?
					WHERE anwesenheit_user_id IN ? ';
		$resultUpdate = $this->execQuery($query, [$updateStatus, getAuthUID(), date('Y-m-d H:i:s'), $anwesenheiten_user_ids]);

		return $resultUpdate;
	}

	public function getAllLehreinheitenForLvaAndMaUid($lva_id, $ma_uid, $sem_kurzbz)
	{
		$query = "SELECT DISTINCT tbl_lehreinheitmitarbeiter.lehreinheit_id, tbl_lehreinheit.lehrveranstaltung_id, tbl_lehreinheit.lehrform_kurzbz,
						tbl_lehreinheitmitarbeiter.mitarbeiter_uid,
						tbl_lehreinheitgruppe.semester,
						tbl_lehreinheitgruppe.verband,
						tbl_lehreinheitgruppe.gruppe,
						tbl_lehreinheitgruppe.gruppe_kurzbz,
						tbl_lehrveranstaltung.kurzbz,
			 			tbl_studiengang.kurzbzlang,
			 			tbl_gruppe.direktinskription,
						tbl_gruppe.sichtbar,
						tbl_gruppe.aktiv,
			 			(SELECT COUNT(DISTINCT datum) FROM campus.vw_stundenplan WHERE lehreinheit_id = lehre.tbl_lehreinheit.lehreinheit_id) as termincount,
						(SELECT COUNT(*) FROM campus.vw_student_lehrveranstaltung WHERE lehreinheit_id = lehre.tbl_lehreinheit.lehreinheit_id) as studentcount
		FROM lehre.tbl_lehreinheit JOIN lehre.tbl_lehreinheitmitarbeiter USING(lehreinheit_id)
			JOIN lehre.tbl_lehreinheitgruppe USING(lehreinheit_id)
			JOIN lehre.tbl_lehrveranstaltung USING(lehrveranstaltung_id)
			JOIN public.tbl_studiengang ON (tbl_lehreinheitgruppe.studiengang_kz = tbl_studiengang.studiengang_kz)
			LEFT JOIN public.tbl_gruppe USING (gruppe_kurzbz)
		WHERE lehrveranstaltung_id = ? AND studiensemester_kurzbz = ? AND mitarbeiter_uid = ?
		ORDER BY tbl_lehreinheitgruppe.gruppe_kurzbz";

		return $this->execQuery($query, [$lva_id, $sem_kurzbz, $ma_uid]);
	}

	public function getAllLehreinheitenForLva($lva_id, $sem_kurzbz)
	{
		$query = "SELECT DISTINCT tbl_lehreinheitmitarbeiter.lehreinheit_id, tbl_lehreinheit.lehrveranstaltung_id, tbl_lehreinheit.lehrform_kurzbz,
						tbl_lehreinheitmitarbeiter.mitarbeiter_uid,
						tbl_lehreinheitgruppe.semester,
						tbl_lehreinheitgruppe.verband,
						tbl_lehreinheitgruppe.gruppe,
						tbl_lehreinheitgruppe.gruppe_kurzbz,
						tbl_lehrveranstaltung.kurzbz,
						tbl_studiengang.kurzbzlang,
						(SELECT COUNT(DISTINCT datum) FROM campus.vw_stundenplan WHERE lehreinheit_id = lehre.tbl_lehreinheit.lehreinheit_id) as termincount,
						(SELECT COUNT(*) FROM campus.vw_student_lehrveranstaltung WHERE lehreinheit_id = lehre.tbl_lehreinheit.lehreinheit_id) as studentcount
		FROM lehre.tbl_lehreinheit JOIN lehre.tbl_lehreinheitmitarbeiter USING(lehreinheit_id)
								   JOIN lehre.tbl_lehreinheitgruppe USING(lehreinheit_id)
								   JOIN lehre.tbl_lehrveranstaltung USING(lehrveranstaltung_id)
								   JOIN public.tbl_studiengang ON (tbl_lehreinheitgruppe.studiengang_kz = tbl_studiengang.studiengang_kz)
		WHERE lehrveranstaltung_id = ? AND studiensemester_kurzbz = ?
		ORDER BY tbl_lehreinheitgruppe.gruppe_kurzbz";

		return $this->execQuery($query, [$lva_id, $sem_kurzbz]);
	}

	public function getCheckInCountsForAnwesenheitId($anwesenheit_id, $anwesendStatus, $abwesenStatus, $entschuldigtStatus)
	{
		$query = "SELECT (SELECT COUNT(*)
			FROM extension.tbl_anwesenheit_user
			LEFT JOIN extension.tbl_anwesenheit USING(anwesenheit_id)
			WHERE anwesenheit_id = ? AND status = ?) as anwesend,
		(SELECT COUNT(*)
			FROM extension.tbl_anwesenheit_user
			LEFT JOIN extension.tbl_anwesenheit USING(anwesenheit_id)
			WHERE anwesenheit_id = ? AND status = ?) as abwesend,
		(SELECT COUNT(*)
				FROM extension.tbl_anwesenheit_user
				LEFT JOIN extension.tbl_anwesenheit USING(anwesenheit_id)
				WHERE anwesenheit_id = ? AND status = ?) as entschuldigt;";

		return $this->execQuery($query, [$anwesenheit_id, $anwesendStatus, $anwesenheit_id, $abwesenStatus, $anwesenheit_id, $entschuldigtStatus]);
	}

	public function getStudiengaenge()
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

	public function getAllAnwesenheitenByStudiengang($stg_kz, $sem_kurzbz)
	{
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

	public function getLektorIsTeachingLE($le_id, $ma_uid)
	{
		$query = "SELECT COUNT(*) > 0
			FROM lehre.tbl_lehreinheitmitarbeiter
			WHERE lehreinheit_id = ? AND mitarbeiter_uid = ?";

		return $this->execReadOnlyQuery($query, [$le_id, $ma_uid]);
	}

	public function getLektorIsTeachingLva($lva_id, $ma_uid)
	{
		$query = "SELECT COUNT(*) > 0
			FROM lehre.tbl_lehreinheitmitarbeiter
				JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
				JOIN lehre.tbl_lehrveranstaltung USING (lehrveranstaltung_id)
			WHERE lehrveranstaltung_id = ? AND mitarbeiter_uid = ?";

		return $this->execReadOnlyQuery($query, [$lva_id, $ma_uid]);
	}

	public function getLektorenForLvaInSemester($lva_id, $sem_kurzbz)
	{
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

	public function getAllLvaWithLEForSgAndSem($sg, $sem)
	{
		$qry = "SELECT DISTINCT ON (lehre.tbl_lehreinheit.lehrveranstaltung_id, lehreinheit_id) lehreinheit_id, lehre.tbl_lehreinheit.lehrveranstaltung_id
				FROM lehre.vw_stundenplan JOIN lehre.tbl_lehreinheit USING(lehreinheit_id)
				WHERE studiengang_kz = ? AND studiensemester_kurzbz = ?;";

		return $this->execReadOnlyQuery($qry, [$sg, $sem]);

	}

}