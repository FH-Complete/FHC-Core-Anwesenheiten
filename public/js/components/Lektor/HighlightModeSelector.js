export const HighlightModeSelector = {
	name: 'HighlightModeSelector',
	props: {
		modelValue: {
			type: String,
			default: 'allowed'
		}
	},
	emits: ['update:modelValue'],
	template: `
		<div class="col">
			<div class="row" style="margin-left: 12px;">{{ $p.t('global/highlightsettings') }}</div>
			<div class="justify-content-center align-items-center flex-nowrap overflow-hidden" style="display: flex; height: 80px;">
				<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="modelValue == 'termine'" @click="$emit('update:modelValue', 'termine')">{{$p.t('global/termineV2')}} </button>
				<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="modelValue == 'kontrollen'" @click="$emit('update:modelValue', 'kontrollen')">{{$p.t('global/kontrollen')}}</button>
				<button role="button" class="col text-white option-entry text-center h-100 w-100 btn" :selected="modelValue == 'allowed'" @click="$emit('update:modelValue', 'allowed')">{{$p.t('global/allowed')}}</button>
			</div>
		</div>
	`
};
