// The cy.task functions of the suite. db is the DB part of core (tests/cypress/tasks/db.js):
// connection, write guard and pool. Scope every write by Lehreinheit ids, person ids or ids of the suite's rows,
// no unscoped DELETE in this file.

const ids = (value, name) => {
	if (!Array.isArray(value) || !value.length || value.some(id => !Number.isInteger(id))) {
		throw new Error(`anw:db refused - ${name} must be a non-empty array of integers`);
	}
	return value;
};

// the students that a new Kontrolle gets an entry for, like Anwesenheit_User_model::createNewUserAnwesenheitenEntries
const ACTIVE_STUDENTS = `
	SELECT DISTINCT v.lehreinheit_id, s.prestudent_id, p.person_id, v.uid, s.studiengang_kz
	FROM campus.vw_student_lehrveranstaltung v
		JOIN public.tbl_student s ON (s.student_uid = v.uid)
		JOIN public.tbl_prestudent p ON (p.prestudent_id = s.prestudent_id)
		JOIN public.tbl_benutzer b ON (b.uid = v.uid)
	WHERE b.aktiv`;

const TEACHES = `
	SELECT DISTINCT le.lehreinheit_id, le.lehrveranstaltung_id, le.studiensemester_kurzbz, lower(m.mitarbeiter_uid) AS uid
	FROM lehre.tbl_lehreinheit le
		JOIN lehre.tbl_lehreinheitmitarbeiter m USING (lehreinheit_id)`;

/**
 * The test LE of the suite: an LE of the lektor ($1) with active students, and an LE of the kollege ($2) in the same
 * LV and semester. An LE with a test student ($3, uids) and the newest semester win. One row: lv_id, sem_kurzbz, le_id,
 * with_test_student, foreign_le_id. checks.js runs the same query, so the fixture check sees the LE of the run.
 */
const TEST_LE_SQL = `
	WITH active AS (${ACTIVE_STUDENTS}), teaches AS (${TEACHES})
	SELECT * FROM (
		SELECT own.lehrveranstaltung_id AS lv_id, own.studiensemester_kurzbz AS sem_kurzbz, own.lehreinheit_id AS le_id,
			sem.start,
			EXISTS (SELECT 1 FROM active a WHERE a.lehreinheit_id = own.lehreinheit_id AND a.uid = ANY($3)) AS with_test_student,
			(SELECT min(f.lehreinheit_id) FROM teaches f
				WHERE f.uid = $2 AND f.lehrveranstaltung_id = own.lehrveranstaltung_id
					AND f.studiensemester_kurzbz = own.studiensemester_kurzbz
					AND NOT EXISTS (SELECT 1 FROM teaches x WHERE x.lehreinheit_id = f.lehreinheit_id AND x.uid = $1)
			) AS foreign_le_id
		FROM teaches own
			JOIN public.tbl_studiensemester sem USING (studiensemester_kurzbz)
		WHERE own.uid = $1
			AND NOT EXISTS (SELECT 1 FROM teaches x WHERE x.lehreinheit_id = own.lehreinheit_id AND x.uid = $2)
			AND EXISTS (SELECT 1 FROM active a WHERE a.lehreinheit_id = own.lehreinheit_id)
	) c
	WHERE c.foreign_le_id IS NOT NULL
	ORDER BY c.with_test_student DESC, c.start DESC, c.le_id
	LIMIT 1`;

/** An LV of the lektor ($1) that the kollege ($2) does not teach, other than the test LV (lvSql) */
const otherLvSql = lvSql => `
	WITH teaches AS (${TEACHES})
	SELECT t.lehrveranstaltung_id AS lv_id, t.studiensemester_kurzbz AS sem_kurzbz, min(t.lehreinheit_id) AS le_id
	FROM teaches t
	WHERE t.uid = $1 AND t.lehrveranstaltung_id <> ${lvSql}
		AND NOT EXISTS (SELECT 1 FROM teaches x WHERE x.lehrveranstaltung_id = t.lehrveranstaltung_id AND x.uid = $2)
	GROUP BY t.lehrveranstaltung_id, t.studiensemester_kurzbz
	ORDER BY t.lehrveranstaltung_id, t.studiensemester_kurzbz
	LIMIT 1`;

/** The test LV: TEST_LE_SQL, the other LV, the students and the test students. Null without a test LE */
const context = db => ({ lektor, kollege, students }) =>
	db.withClient(async client => {
		const params = [lektor.toLowerCase(), kollege.toLowerCase()];
		const found = (await client.query(TEST_LE_SQL, [...params, students.map(uid => uid.toLowerCase())])).rows[0];
		if (!found) return null;

		const other = (await client.query(otherLvSql('$3'), [...params, found.lv_id])).rows[0];

		const studentsOf = async leId =>
			(await client.query(`
				WITH active AS (${ACTIVE_STUDENTS})
				SELECT prestudent_id AS "prestudentId", person_id AS "personId", uid, studiengang_kz AS "studiengangKz"
				FROM active WHERE lehreinheit_id = $1 ORDER BY prestudent_id`, [leId])).rows;

		// the accounts of the test students, and whether they are in the test LE
		const testStudents = (await client.query(`
			WITH active AS (${ACTIVE_STUDENTS})
			SELECT lower(s.student_uid) AS uid, p.person_id AS "personId", s.prestudent_id AS "prestudentId",
				s.studiengang_kz AS "studiengangKz",
				EXISTS (SELECT 1 FROM active a WHERE a.uid = s.student_uid AND a.lehreinheit_id = $2) AS "inLe"
			FROM public.tbl_student s
				JOIN public.tbl_prestudent p USING (prestudent_id)
			WHERE lower(s.student_uid) = ANY($1)`, [students.map(uid => uid.toLowerCase()), found.le_id])).rows;

		// one active student per active Studiengang with a status, the Entschuldigungsmanagement lists only these.
		// A student with an LV wins: the scope specs read the student list of that LV (anw:db:lvOfStudent)
		const stgStudents = (await client.query(`
			SELECT DISTINCT ON (s.studiengang_kz) s.studiengang_kz AS "studiengangKz", lower(s.student_uid) AS uid,
				p.person_id AS "personId", s.prestudent_id AS "prestudentId"
			FROM public.tbl_student s
				JOIN public.tbl_prestudent p USING (prestudent_id)
				JOIN public.tbl_benutzer b ON (b.uid = s.student_uid)
				JOIN public.tbl_studiengang sg ON (sg.studiengang_kz = s.studiengang_kz)
			WHERE b.aktiv AND sg.aktiv
				AND EXISTS (SELECT 1 FROM public.tbl_prestudentstatus st WHERE st.prestudent_id = s.prestudent_id)
			ORDER BY s.studiengang_kz,
				EXISTS (SELECT 1 FROM campus.vw_student_lehrveranstaltung v WHERE v.uid = s.student_uid) DESC,
				s.prestudent_id`)).rows;

		// every other LV of the lektor with one of its LEs, an LE with students first: loadAdminForeignLv searches them
		const lektorLvs = (await client.query(`
			WITH active AS (${ACTIVE_STUDENTS}), teaches AS (${TEACHES}),
				les AS (SELECT t.*, EXISTS (SELECT 1 FROM active a WHERE a.lehreinheit_id = t.lehreinheit_id) AS with_students
					FROM teaches t WHERE t.uid = $1 AND t.lehrveranstaltung_id <> $2)
			SELECT DISTINCT ON (lehrveranstaltung_id, studiensemester_kurzbz)
				lehrveranstaltung_id AS "lvId", studiensemester_kurzbz AS "semKurzbz", lehreinheit_id AS le, with_students
			FROM les
			ORDER BY lehrveranstaltung_id, studiensemester_kurzbz, with_students DESC, lehreinheit_id`,
			[params[0], found.lv_id])).rows.sort((a, b) => b.with_students - a.with_students);

		return {
			lvId: found.lv_id,
			semKurzbz: found.sem_kurzbz,
			le: found.le_id,
			foreignLe: found.foreign_le_id,
			// an LV of the lektor that the kollege does not teach
			otherLv: other ? other.lv_id : null,
			otherSemKurzbz: other ? other.sem_kurzbz : null,
			otherLe: other ? other.le_id : null,
			lektorLvs,
			students: await studentsOf(found.le_id),
			foreignStudents: await studentsOf(found.foreign_le_id),
			testStudents,
			stgStudents,
		};
	});

/** Deletes the Kontrollen of the Lehreinheiten with their codes, entries and history. */
const resetKontrollen = db => ({ leIds }) => {
	db.assertWritable();
	ids(leIds, 'leIds');

	return db.inTransaction(async client => {
		const kontrollen = 'SELECT anwesenheit_id FROM extension.tbl_anwesenheit WHERE lehreinheit_id = ANY($1::int[])';
		const history = await client.query(
			`DELETE FROM extension.tbl_anwesenheit_user_history WHERE anwesenheit_id IN (${kontrollen})`, [leIds]);
		const entries = await client.query(
			`DELETE FROM extension.tbl_anwesenheit_user WHERE anwesenheit_id IN (${kontrollen})`, [leIds]);
		const codes = await client.query(
			`DELETE FROM extension.tbl_anwesenheit_check WHERE anwesenheit_id IN (${kontrollen})`, [leIds]);
		const deleted = await client.query(
			'DELETE FROM extension.tbl_anwesenheit WHERE lehreinheit_id = ANY($1::int[])', [leIds]);

		return { history: history.rowCount, entries: entries.rowCount, codes: codes.rowCount, kontrollen: deleted.rowCount };
	});
};

/** Deletes the Entschuldigungen of the persons with their history. The DMS rows of the documents stay. */
const resetEntschuldigungen = db => ({ personIds }) => {
	db.assertWritable();
	ids(personIds, 'personIds');

	return db.inTransaction(async client => {
		const history = await client.query(
			'DELETE FROM extension.tbl_anwesenheit_entschuldigung_history WHERE person_id = ANY($1::int[])', [personIds]);
		const deleted = await client.query(
			'DELETE FROM extension.tbl_anwesenheit_entschuldigung WHERE person_id = ANY($1::int[])', [personIds]);

		return { history: history.rowCount, entschuldigungen: deleted.rowCount };
	});
};

/** Moves the insertamum of a Kontrolle into the past: the API cannot create an old Kontrolle. */
const backdateKontrolle = db => ({ anwesenheitId, leIds, days }) => {
	db.assertWritable();
	ids([anwesenheitId], 'anwesenheitId');
	ids(leIds, 'leIds');

	return db.inTransaction(async client => {
		const result = await client.query(
			`UPDATE extension.tbl_anwesenheit SET insertamum = insertamum - make_interval(days => $3)
			WHERE anwesenheit_id = $1 AND lehreinheit_id = ANY($2::int[])`, [anwesenheitId, leIds, days]);
		if (result.rowCount !== 1) throw new Error(`anw:db:backdateKontrolle - no Kontrolle ${anwesenheitId} in the LEs`);
		return result.rowCount;
	});
};

/** Deletes one entry of a Kontrolle with its history: the state of a student who joined the LE after the Kontrolle. */
const deleteEntry = db => ({ anwesenheitUserId, leIds }) => {
	db.assertWritable();
	ids([anwesenheitUserId], 'anwesenheitUserId');
	ids(leIds, 'leIds');

	return db.inTransaction(async client => {
		const inLes = `anwesenheit_user_id = $1 AND anwesenheit_id IN
			(SELECT anwesenheit_id FROM extension.tbl_anwesenheit WHERE lehreinheit_id = ANY($2::int[]))`;
		await client.query(`DELETE FROM extension.tbl_anwesenheit_user_history WHERE ${inLes}`, [anwesenheitUserId, leIds]);
		const result = await client.query(`DELETE FROM extension.tbl_anwesenheit_user WHERE ${inLes}`, [anwesenheitUserId, leIds]);
		if (result.rowCount !== 1) throw new Error(`anw:db:deleteEntry - no entry ${anwesenheitUserId} in the LEs`);
		return result.rowCount;
	});
};

/** Moves the insertamum of the codes of a Kontrolle into the past: checkInAnwesenheit rejects an old code. */
const backdateCode = db => ({ anwesenheitId, leIds, seconds = 0, months = 0 }) => {
	db.assertWritable();
	ids([anwesenheitId], 'anwesenheitId');
	ids(leIds, 'leIds');

	return db.inTransaction(async client => {
		const result = await client.query(
			`UPDATE extension.tbl_anwesenheit_check SET insertamum = insertamum - make_interval(months => $4, secs => $3)
			WHERE anwesenheit_id = $1
				AND anwesenheit_id IN (SELECT anwesenheit_id FROM extension.tbl_anwesenheit WHERE lehreinheit_id = ANY($2::int[]))`,
			[anwesenheitId, leIds, seconds, months]);
		if (!result.rowCount) throw new Error(`anw:db:backdateCode - no code of Kontrolle ${anwesenheitId} in the LEs`);
		return result.rowCount;
	});
};

/** Moves the insertamum of an Entschuldigung into the past: the upload deadline counts from it. */
const backdateEntschuldigung = db => ({ entschuldigungId, personIds, days }) => {
	db.assertWritable();
	ids([entschuldigungId], 'entschuldigungId');
	ids(personIds, 'personIds');

	return db.inTransaction(async client => {
		const result = await client.query(
			`UPDATE extension.tbl_anwesenheit_entschuldigung SET insertamum = insertamum - make_interval(days => $3)
			WHERE entschuldigung_id = $1 AND person_id = ANY($2::int[])`, [entschuldigungId, personIds, days]);
		if (result.rowCount !== 1) {
			throw new Error(`anw:db:backdateEntschuldigung - no Entschuldigung ${entschuldigungId} of the persons`);
		}
		return result.rowCount;
	});
};

/**
 * An open Entschuldigung without a document for a student that no account of the suite may create one for through
 * the API: a student outside the Studiengaenge of the staff accounts. personIds: the persons of the suite.
 */
const seedEntschuldigung = db => ({ personId, personIds, von, bis }) => {
	db.assertWritable();
	ids([personId], 'personId');
	if (!ids(personIds, 'personIds').includes(personId)) {
		throw new Error(`anw:db:seedEntschuldigung refused - person ${personId} is no person of the suite`);
	}

	return db.inTransaction(async client =>
		(await client.query(
			`INSERT INTO extension.tbl_anwesenheit_entschuldigung (person_id, von, bis, dms_id, insertamum, insertvon, version)
			VALUES ($1, $2::timestamp, $3::timestamp, NULL, now(), 'cypress', 1) RETURNING entschuldigung_id`,
			[personId, von, bis])).rows[0].entschuldigung_id);
};

/**
 * Gives an Entschuldigung to another person of the suite, with its document. The API lets no account of the suite
 * upload a document for a student outside the Studiengaenge of the staff accounts.
 */
const moveEntschuldigung = db => ({ entschuldigungId, personId, personIds }) => {
	db.assertWritable();
	ids([entschuldigungId], 'entschuldigungId');
	ids([personId], 'personId');
	if (!ids(personIds, 'personIds').includes(personId)) {
		throw new Error(`anw:db:moveEntschuldigung refused - person ${personId} is no person of the suite`);
	}

	return db.inTransaction(async client => {
		const result = await client.query(
			`UPDATE extension.tbl_anwesenheit_entschuldigung SET person_id = $2
			WHERE entschuldigung_id = $1 AND person_id = ANY($3::int[])`, [entschuldigungId, personId, personIds]);
		if (result.rowCount !== 1) throw new Error(`anw:db:moveEntschuldigung - no Entschuldigung ${entschuldigungId} of the persons`);
		return result.rowCount;
	});
};

/**
 * A time range on the day that counts 0 minutes: one hour before the first Stunde of the raster, 30 minutes long.
 * null if the raster starts before 01:00.
 */
const zeroMinuteSlot = db => ({ date }) =>
	db.withClient(async client => {
		const row = (await client.query(
			`SELECT to_char(min(beginn) - interval '60 minutes', 'HH24:MI') AS von,
				to_char(min(beginn) - interval '30 minutes', 'HH24:MI') AS bis,
				min(beginn) >= time '01:00' AS possible
			FROM lehre.tbl_stunde`)).rows[0];
		if (!row || !row.possible) return null;

		const counted = (await client.query(
			'SELECT extension.get_epoch_from_anw_times($1::timestamp, $2::timestamp) AS s',
			[`${date} ${row.von}:00`, `${date} ${row.bis}:00`])).rows[0].s;
		return Number(counted) === 0 ? { von: row.von, bis: row.bis } : null;
	});

/** The webservicelog rows of a Kontrolle with this beschreibung: { executeUser, requestData } */
const readKontrolleLog = db => ({ beschreibung, anwesenheitId }) =>
	db.withClient(async client =>
		(await client.query(
			`SELECT execute_user AS "executeUser", request_data AS "requestData" FROM system.tbl_webservicelog
			WHERE beschreibung = $1 AND request_data ~ ('"anwesenheit_id":"?' || $2::int || '"?[,}]')
			ORDER BY webservicelog_id`, [beschreibung, anwesenheitId])).rows);

/** The webservicelog rows with this beschreibung whose request_data holds the text: { executeUser, requestData } */
const readWebservicelog = db => ({ beschreibung, contains }) =>
	db.withClient(async client =>
		(await client.query(
			`SELECT execute_user AS "executeUser", request_data AS "requestData" FROM system.tbl_webservicelog
			WHERE beschreibung = $1 AND position($2 in request_data) > 0
			ORDER BY webservicelog_id`, [beschreibung, contains])).rows);

/**
 * The Termine of an LE from the Stundenplan: consecutive Stunden of a day are one Termin, two blocks on one day
 * are two. [{ datum, beginn, ende }] in the order of the API
 */
const readTermine = db => ({ leId }) =>
	db.withClient(async client =>
		(await client.query(
			`SELECT datum::text, min(beginn)::text AS beginn, max(ende)::text AS ende
			FROM (
				SELECT datum, stunde, beginn, ende, stunde - row_number() OVER (PARTITION BY datum ORDER BY stunde) AS block
				FROM (SELECT DISTINCT datum, stunde, beginn, ende
					FROM lehre.vw_stundenplan JOIN lehre.tbl_stunde USING (stunde) WHERE lehreinheit_id = $1) stunden
			) blocks
			GROUP BY datum, block
			ORDER BY datum, min(stunde)`, [leId])).rows);

/** An LV of a student: { lvId, semKurzbz }, null without one */
const lvOfStudent = db => ({ uid }) =>
	db.withClient(async client =>
		(await client.query(
			`SELECT lehrveranstaltung_id AS "lvId", studiensemester_kurzbz AS "semKurzbz"
			FROM campus.vw_student_lehrveranstaltung WHERE uid = $1
			ORDER BY lehrveranstaltung_id, studiensemester_kurzbz LIMIT 1`, [uid])).rows[0] || null);

/** The stored file of a DMS document: { filename (on the disk), name (the upload name), mimetype } */
const readDmsFile = db => ({ dmsId }) =>
	db.withClient(async client =>
		(await client.query(
			'SELECT filename, name, mimetype FROM campus.tbl_dms_version WHERE dms_id = $1 ORDER BY version DESC LIMIT 1',
			[dmsId])).rows[0] || null);

/** The number of DMS versions that an account uploaded */
const countDmsOf = db => ({ uid }) =>
	db.withClient(async client =>
		(await client.query('SELECT count(*)::int AS n FROM campus.tbl_dms_version WHERE insertvon = $1', [uid])).rows[0].n);

/** The stored Entschuldigung, its history rows (oldest first) and whether its DMS document exists. */
const readEntschuldigung = db => ({ entschuldigungId }) =>
	db.withClient(async client => {
		const entschuldigung = (await client.query(
			`SELECT entschuldigung_id, person_id, von::text, bis::text, akzeptiert, notiz, dms_id, version,
				insertvon, updatevon, statussetvon
			FROM extension.tbl_anwesenheit_entschuldigung WHERE entschuldigung_id = $1`, [entschuldigungId])).rows[0] || null;
		const history = (await client.query(
			`SELECT von::text, bis::text, akzeptiert, notiz, dms_id, version
			FROM extension.tbl_anwesenheit_entschuldigung_history WHERE entschuldigung_id = $1
			ORDER BY entschuldigung_history_id`, [entschuldigungId])).rows;
		const document = entschuldigung && entschuldigung.dms_id !== null
			? (await client.query('SELECT count(*)::int AS n FROM campus.tbl_dms WHERE dms_id = $1', [entschuldigung.dms_id]))
				.rows[0].n > 0
			: null;

		return { entschuldigung, history, document };
	});

/** The number of Entschuldigungen of the persons */
const countEntschuldigungen = db => ({ personIds }) =>
	db.withClient(async client =>
		(await client.query('SELECT count(*)::int AS n FROM extension.tbl_anwesenheit_entschuldigung WHERE person_id = ANY($1::int[])',
			[ids(personIds, 'personIds')])).rows[0].n);

/** Whether DMS documents exist */
const dmsExists = db => ({ dmsId }) =>
	db.withClient(async client =>
		(await client.query('SELECT count(*)::int AS n FROM campus.tbl_dms WHERE dms_id = $1', [dmsId])).rows[0].n > 0);

/** The stored state of a Kontrolle: the row, its entries, the number of history rows and its codes. With the audit fields. */
const readKontrolle = db => ({ anwesenheitId }) =>
	db.withClient(async client => {
		// dauer: the minutes that the quota and the Fehlminuten check count, without the breaks of the Stunden raster
		const kontrolle = (await client.query(
			`SELECT anwesenheit_id, lehreinheit_id, von::text, bis::text, insertamum::text, insertvon, updatevon,
				CAST(extension.get_epoch_from_anw_times(von, bis) / 60 AS INTEGER) AS dauer
			FROM extension.tbl_anwesenheit WHERE anwesenheit_id = $1`, [anwesenheitId])).rows[0] || null;
		const entries = (await client.query(
			`SELECT anwesenheit_user_id, prestudent_id, status, fehlminuten, notiz, version, insertvon, updatevon, statussetvon
			FROM extension.tbl_anwesenheit_user WHERE anwesenheit_id = $1 ORDER BY anwesenheit_user_id`, [anwesenheitId])).rows;
		const history = (await client.query(
			'SELECT count(*)::int AS n FROM extension.tbl_anwesenheit_user_history WHERE anwesenheit_id = $1', [anwesenheitId])).rows[0].n;
		const codes = (await client.query(
			`SELECT zugangscode FROM extension.tbl_anwesenheit_check
			WHERE anwesenheit_id = $1 ORDER BY anwesenheit_check_id`, [anwesenheitId])).rows.map(row => row.zugangscode);

		return { kontrolle, entries, history, codes };
	});

/** The minutes of von - bis on date that the server counts, like the dauer of readKontrolle */
const countedMinutes = db => ({ date, von, bis }) =>
	db.withClient(async client =>
		(await client.query(
			'SELECT CAST(extension.get_epoch_from_anw_times($1::timestamp, $2::timestamp) / 60 AS INTEGER) AS n',
			[`${date} ${von}:00`, `${date} ${bis}:00`])).rows[0].n);

/** The number of Kontrollen in the Lehreinheiten */
const countKontrollen = db => ({ leIds }) =>
	db.withClient(async client =>
		(await client.query('SELECT count(*)::int AS n FROM extension.tbl_anwesenheit WHERE lehreinheit_id = ANY($1::int[])',
			[ids(leIds, 'leIds')])).rows[0].n);

/** The history rows of entries, oldest first. */
const readHistory = db => ({ anwesenheitUserIds }) =>
	db.withClient(async client =>
		(await client.query(
			`SELECT anwesenheit_user_id, status, fehlminuten, notiz, version FROM extension.tbl_anwesenheit_user_history
			WHERE anwesenheit_user_id = ANY($1::int[]) ORDER BY anwesenheit_user_history_id`,
			[ids(anwesenheitUserIds, 'anwesenheitUserIds')])).rows);

const registerAnwDbTasks = (on, db) => {
	on('task', {
		// the specs that reset data need the database of the instance and its write guard
		'anw:db:available': () => db.checkConnection({ requireWrites: true }),
		'anw:db:context': context(db),
		'anw:db:resetKontrollen': resetKontrollen(db),
		'anw:db:resetEntschuldigungen': resetEntschuldigungen(db),
		'anw:db:backdateKontrolle': backdateKontrolle(db),
		'anw:db:deleteEntry': deleteEntry(db),
		'anw:db:backdateCode': backdateCode(db),
		'anw:db:backdateEntschuldigung': backdateEntschuldigung(db),
		'anw:db:seedEntschuldigung': seedEntschuldigung(db),
		'anw:db:moveEntschuldigung': moveEntschuldigung(db),
		'anw:db:zeroMinuteSlot': zeroMinuteSlot(db),
		'anw:db:readKontrolleLog': readKontrolleLog(db),
		'anw:db:readWebservicelog': readWebservicelog(db),
		'anw:db:readTermine': readTermine(db),
		'anw:db:lvOfStudent': lvOfStudent(db),
		'anw:db:countDmsOf': countDmsOf(db),
		'anw:db:readDmsFile': readDmsFile(db),
		'anw:db:readEntschuldigung': readEntschuldigung(db),
		'anw:db:countEntschuldigungen': countEntschuldigungen(db),
		'anw:db:dmsExists': dmsExists(db),
		'anw:db:readKontrolle': readKontrolle(db),
		'anw:db:countKontrollen': countKontrollen(db),
		'anw:db:countedMinutes': countedMinutes(db),
		'anw:db:readHistory': readHistory(db),
	});
};

module.exports = { registerAnwDbTasks, ACTIVE_STUDENTS, TEST_LE_SQL, otherLvSql };
