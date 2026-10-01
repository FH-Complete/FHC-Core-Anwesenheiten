// student accounts of one person: uid, studiengang and orgform in the order of the uids, like the table columns
export const AccountList = {
	name: "AccountList",
	props: {
		accounts: {
			type: Array,
			required: true
		}
	},
	template: `
		<ul class="mb-0">
			<li v-for="account in accounts" :key="account.uid">{{ account.uid }}: {{ account.kurzbzlang }} {{ account.bezeichnung }}, {{ account.orgform_kurzbz ?? '-' }}</li>
		</ul>
	`
}
