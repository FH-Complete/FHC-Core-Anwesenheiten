
// every sample uses the same status class as the lektor table, so the legend
// always shows the colors of the table
export const Statuslegende = {
	name: 'Statuslegende',
	computed: {
		// the suffixes that LektorComponent.formatZusatz() appends to the nachname.
		// (ar), (iar) and (nz) are the anmerkung of a grade the lektor must not overwrite
		namenszusaetze() {
			return [
				{ code: '(i)', phrase: 'global/anwZusatzIncoming' },
				{ code: '(o) (' + this.$p.t('global/anwZusatzOutgoingAb', ['…']) + ')', phrase: 'global/anwZusatzOutgoing' },
				{ code: '(ma)', phrase: 'global/anwZusatzMitarbeiter' },
				{ code: '(a.o.)', phrase: 'global/anwZusatzAusserordentlich' },
				{ code: '(d.d.int.)', phrase: 'global/anwZusatzDoubleDegreeIntern' },
				{ code: '(d.d.ext.)', phrase: 'global/anwZusatzDoubleDegreeExtern' },
				{ code: '(ar)', phrase: 'global/anwZusatzAngerechnet' },
				{ code: '(iar)', phrase: 'global/anwZusatzInternAngerechnet' },
				{ code: '(nz)', phrase: 'global/anwZusatzNichtZugelassen' }
			]
		},
		// the name columns of the table carry the row color
		sampleName() {
			return this.$capitalize(this.$p.t('person/vorname')) + ' ' + this.$capitalize(this.$p.t('person/nachname'))
		}
	},
	template:`
		<div class="anw-legend">
			<section class="anw-legend-section">
				<h6 class="anw-legend-heading">{{ $p.t('global/status') }}</h6>
				<ul class="anw-legend-list anw-legend-list-grid">
					<li class="anw-legend-item">
						<span class="anw-legend-sample anw-anwesend"><i class="fa fa-check" aria-hidden="true"></i></span>
						<span>{{ $capitalize($p.t('global/anwesend')) }}</span>
					</li>
					<li class="anw-legend-item">
						<span class="anw-legend-sample anw-verspaetet gap-2">
							<i class="fa-solid fa-user-clock" aria-hidden="true"></i>
							<span>{{ $p.t('global/anwFehlminutenKurz', {minuten: 15}) }}</span>
						</span>
						<span>{{ $p.t('global/anwLegendeVerspaetet') }}</span>
					</li>
					<li class="anw-legend-item">
						<span class="anw-legend-sample anw-abwesend"><i class="fa fa-xmark" aria-hidden="true"></i></span>
						<span>{{ $capitalize($p.t('global/abwesend')) }}</span>
					</li>
					<li v-if="$entryParams.permissions.entschuldigungen_enabled" class="anw-legend-item">
						<span class="anw-legend-sample anw-entschuldigt"><i class="fa-solid fa-user-shield" aria-hidden="true"></i></span>
						<span>{{ $capitalize($p.t('global/entschuldigt')) }}</span>
					</li>
				</ul>
			</section>

			<section class="anw-legend-section">
				<h6 class="anw-legend-heading">{{ $p.t('global/entschuldigungen') }}</h6>
				<ul class="anw-legend-list anw-legend-list-grid">
					<li class="anw-legend-item">
						<span class="anw-legend-sample anw-entschuldigt">{{ sampleName }}</span>
						<span>{{ $p.t('global/anwLegendeEntschuldigtBestaetigt') }}</span>
					</li>
					<li class="anw-legend-item">
						<span class="anw-legend-sample anw-entschuldigt-offen">{{ sampleName }}</span>
						<span>{{ $p.t('global/anwLegendeEntschuldigtOffen') }}</span>
					</li>
				</ul>
			</section>

			<section class="anw-legend-section">
				<h6 class="anw-legend-heading">{{ $p.t('global/anwNamenszusaetze') }}</h6>
				<ul class="anw-legend-list anw-legend-list-grid">
					<li v-for="zusatz in namenszusaetze" :key="zusatz.code" class="anw-legend-item">
						<span class="anw-legend-sample">{{ zusatz.code }}</span>
						<span>{{ $p.t(zusatz.phrase) }}</span>
					</li>
				</ul>
			</section>

			<section class="anw-legend-section">
				<h6 class="anw-legend-heading">{{ $p.t('lehre/lehreinheit') }}</h6>
				<ul class="anw-legend-list anw-legend-list-grid">
					<li class="anw-legend-item">
						<span class="anw-legend-sample" aria-hidden="true">👥</span>
						<span>{{ $p.t('global/anwStudierendeImLvTeil') }}</span>
					</li>
					<li class="anw-legend-item">
						<span class="anw-legend-sample" aria-hidden="true">📅</span>
						<span>{{ $capitalize($p.t('global/termineAusStundenplanV2')) }}</span>
					</li>
				</ul>
			</section>
		</div>
	`
};

export default Statuslegende;
