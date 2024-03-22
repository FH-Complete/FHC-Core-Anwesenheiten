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

	public function getKontrolleForLEOnDate($le_id, $date) {
		$query = "
			SELECT * FROM extension.tbl_anwesenheit
			WHERE DATE(von) = '{$date->year}-{$date->month}-{$date->day}'
			AND lehreinheit_id = {$le_id}
		";

		return $this->execQuery($query);
	}

	public function getAllAnwesenheitenByLektor($lv_id, $le_ids, $sem_kurzbz)
	{
		$query = "
			SELECT
			anwesenheit_user_id,
			ta.anwesenheit_id,
			DATE(ta.von) as datum,
			extension.tbl_anwesenheit_user.status,
			get_anwesenheiten(tbl_anwesenheit_user.prestudent_id, students.lehrveranstaltung_id, students.studiensemester_kurzbz) as sum,
			students.* FROM
		
			(SELECT
				distinct on(nachname, vorname, person_id) vorname, nachname, prestudent_id, studiensemester_kurzbz,
			   campus.vw_student_lehrveranstaltung.lehreinheit_id, campus.vw_student_lehrveranstaltung.lehrveranstaltung_id,
			   tbl_studentlehrverband.semester, tbl_studentlehrverband.verband, tbl_studentlehrverband.gruppe,
			   (SELECT status_kurzbz FROM public.tbl_prestudentstatus
				WHERE prestudent_id=tbl_student.prestudent_id
				ORDER BY datum DESC, insertamum DESC, ext_id DESC LIMIT 1) as studienstatus
			 FROM
				 campus.vw_student_lehrveranstaltung
					 JOIN public.tbl_benutzer USING(uid)
					 JOIN public.tbl_person USING(person_id)
					 LEFT JOIN public.tbl_student ON(uid=student_uid)
					 LEFT JOIN public.tbl_mitarbeiter ON(uid=mitarbeiter_uid)
					 LEFT JOIN public.tbl_studentlehrverband USING(student_uid,studiensemester_kurzbz)
					 LEFT JOIN public.tbl_studiengang ON(tbl_student.studiengang_kz=tbl_studiengang.studiengang_kz)
			 WHERE
				 vw_student_lehrveranstaltung.lehrveranstaltung_id='{$lv_id}'	AND
				 vw_student_lehrveranstaltung.studiensemester_kurzbz='{$sem_kurzbz}' AND ( ";

		foreach ($le_ids as $index => $le_id) {
			if ($index > 0) $query .= " OR ";
			$query .= "vw_student_lehrveranstaltung.lehreinheit_id={$le_id}";
		}

		$query .= " )) students
			LEFT JOIN extension.tbl_anwesenheit_user USING(prestudent_id)
			LEFT JOIN extension.tbl_anwesenheit ta on ta.anwesenheit_id = tbl_anwesenheit_user.anwesenheit_id
		ORDER BY nachname";

//		return $query;

		return $this->execQuery($query);
	}

	public function getAllPersonIdsForLE($le_id)
	{
		$query = "
			SELECT person_id, prestudent_id FROM lehre.tbl_lehreinheit
				JOIN campus.vw_student_lehrveranstaltung USING (lehreinheit_id)
				JOIN tbl_student ON (tbl_student.student_uid = campus.vw_student_lehrveranstaltung.uid)
				JOIN tbl_prestudent USING (prestudent_id)
			WHERE lehreinheit_id = {$le_id};
		";

		return $this->execQuery($query);
	}

	public function getAllAnwesenheitenByLehreinheitByDate($le_id, $date)
	{
		$query = "
			SELECT *
			FROM extension.tbl_anwesenheit_user JOIN extension.tbl_anwesenheit USING (anwesenheit_id)
			WHERE lehreinheit_id = '{$le_id}' AND DATE(extension.tbl_anwesenheit.von) = '{$date}'
			ORDER BY von ASC;
		";

		return $this->execQuery($query);
	}

	public function getHoursForLE($le_id, $date)
	{
		// TODO: test how reliable this is in edge cases

		$query = "
			SELECT * FROM (SELECT DISTINCT(stunde)
			FROM lehre.tbl_stundenplan JOIN lehre.tbl_lehreinheit USING (lehreinheit_id)
			WHERE lehreinheit_id = {$le_id} AND DATE(lehre.tbl_stundenplan.datum) = '{$date}')
				stunden JOIN lehre.tbl_stunde USING(stunde);
		";

		return $this->execQuery($query);
	}

	public function getLehreinheitAndLektorInfo($le_id, $ma_uid, $date)
	{
		$query = "
			SELECT DISTINCT * FROM 
				(
					SELECT tbl_lehreinheit.lehrveranstaltung_id, tbl_lehreinheit.lehreinheit_id, bezeichnung, kurzbz
					FROM lehre.tbl_lehrveranstaltung JOIN lehre.tbl_lehreinheit USING (lehrveranstaltung_id)
					WHERE lehreinheit_id = '{$le_id}'
				) le LEFT JOIN
				(
					SELECT mitarbeiter_uid, beginn, ende, lehreinheit_id
					FROM lehre.tbl_stundenplan JOIN lehre.tbl_stunde USING(stunde)
					WHERE mitarbeiter_uid = '{$ma_uid}'
						AND datum = '{$date}'
				)	sp USING (lehreinheit_id);
		";

		return $this->execQuery($query);

	}

	public function getStudentInfo($prestudent_id, $lva_id, $sem_kurzbz)
	{
		$query = "
			SELECT vorname, nachname, foto, semester, verband, gruppe, get_anwesenheiten({$prestudent_id}, {$lva_id}, '{$sem_kurzbz}') as sum
			FROM public.tbl_benutzer
					 JOIN public.tbl_person USING(person_id)
					 LEFT JOIN public.tbl_student ON(uid=student_uid)
			WHERE prestudent_id = {$prestudent_id};
			
		";

		return $this->execQuery($query);
	}

	public function getAllByStudent($student, $studiensemester)
	{
		$query = '
			SELECT tbl_lehrveranstaltung.bezeichnung,
				tbl_anwesenheit_status.status_kurzbz as student_status,
				(tbl_anwesenheit.von) as von,
				(tbl_anwesenheit.bis) as bis,
				get_anwesenheiten(tbl_anwesenheit_user.prestudent_id, tbl_lehrveranstaltung.lehrveranstaltung_id, tbl_lehreinheit.studiensemester_kurzbz) as anwesenheit,
				(
					SELECT entschuldigung.akzeptiert
					FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
					WHERE entschuldigung.person_id = (
						SELECT tbl_prestudent.person_id
						FROM tbl_prestudent
						WHERE tbl_prestudent.prestudent_id = extension.tbl_anwesenheit_user.prestudent_id
							AND tbl_anwesenheit.von >= entschuldigung.von AND tbl_anwesenheit.bis <= entschuldigung.bis
					)
					ORDER BY akzeptiert DESC NULLS LAST
					LIMIT 1
				) as status_entschuldigung,
				(
					SELECT 1
					FROM extension.tbl_anwesenheit_entschuldigung entschuldigung
					WHERE entschuldigung.person_id = (
						SELECT tbl_prestudent.person_id
						FROM tbl_prestudent
						WHERE tbl_prestudent.prestudent_id = extension.tbl_anwesenheit_user.prestudent_id
							AND tbl_anwesenheit.von >= entschuldigung.von AND tbl_anwesenheit.bis <= entschuldigung.bis
						)
					LIMIT 1
				) as exists_entschuldigung
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

	public function updateAnwesenheitenByDatesStudent($von, $bis, $person_id, $status)
	{
		$query = 'UPDATE extension.tbl_anwesenheit_user SET status = ?
					WHERE anwesenheit_user_id IN (
						SELECT extension.tbl_anwesenheit_user.anwesenheit_user_id
						FROM extension.tbl_anwesenheit_user
						JOIN extension.tbl_anwesenheit ON tbl_anwesenheit_user.anwesenheit_id = tbl_anwesenheit.anwesenheit_id
						WHERE von >= ?
							AND bis <= ?
							AND prestudent_id IN (
								SELECT prestudent_id
								FROM tbl_prestudent
								WHERE person_id = ?
							)
					)
					AND status != ?';

		return $this->execQuery($query, [$status, $von, $bis, $person_id, 'anwesend']);
	}

	public function getAllLehreinheitenForLvaAndMaUid($lva_id, $ma_uid, $sem_kurzbz) {
		$query = "SELECT DISTINCT tbl_stundenplan.lehreinheit_id, tbl_lehreinheit.lehrveranstaltung_id, tbl_lehreinheit.lehrform_kurzbz,
						tbl_stundenplan.mitarbeiter_uid, studiengang_kz, semester, verband, gruppe, gruppe_kurzbz
		FROM lehre.tbl_lehreinheit LEFT JOIN lehre.tbl_stundenplan USING(lehreinheit_id)
		WHERE lehrveranstaltung_id = {$lva_id} AND studiensemester_kurzbz = '{$sem_kurzbz}' AND mitarbeiter_uid = '{$ma_uid}'";

		return $this->execQuery($query);
	}

	public function getAllLehreinheitenForLva($lva_id, $sem_kurzbz) {
		$query = "SELECT DISTINCT tbl_stundenplan.lehreinheit_id, tbl_lehreinheit.lehrveranstaltung_id, tbl_lehreinheit.lehrform_kurzbz,
						tbl_stundenplan.mitarbeiter_uid, studiengang_kz, semester, verband, gruppe, gruppe_kurzbz
		FROM lehre.tbl_lehreinheit LEFT JOIN lehre.tbl_stundenplan USING(lehreinheit_id)
		WHERE lehrveranstaltung_id = {$lva_id} AND studiensemester_kurzbz = '{$sem_kurzbz}'";

		return $this->execQuery($query);
	}

}