<?php
$this->load->view(
    'templates/FHC-Header',
    array(
        'title' => 'Personalverwaltung',
        'bootstrap5' => true,
        'fontawesome6' => true,
        'tabulator5' => true,
        'primevue3' => true,
        'axios027' => true,
        'restclient' => true,
        'filtercomponent' => true,
        'navigationcomponent' => true,
        'phrases' => array(
            'global' => array('mailAnXversandt'),
            'ui' => array('bitteEintragWaehlen')
        ),
        'vue3' => true,
        'customCSSs' => [
            'public/extensions/FHC-Core-Personalverwaltung/css/dashboard.css',
            'public/extensions/FHC-Core-Personalverwaltung/css/personalverwaltung.css',
            'public/extensions/FHC-Core-Personalverwaltung/css/components/EmployeeChooser.css',
            'public/extensions/FHC-Core-Personalverwaltung/css/components/EmployeeHeader.css',
            'public/extensions/FHC-Core-Personalverwaltung/css/components/toast.css',
            'public/css/components/verticalsplit.css',
            'public/css/components/searchbar.css',
        ],
        'customJSs' => [
            'public/extensions/FHC-Core-Personalverwaltung/js/components/Sidebar.js',
        ],
        'customJSModules' => ['public/extensions/FHC-Core-Personalverwaltung/js/apps/Employee.js']
    )
);
?>


<div id="wrapper">
    <router-view></router-view>
</div>

<script>

    var FHC_JS_CONFIG = { domain: '<?php echo DOMAIN; ?>'};

    (function () {
        'use strict'
        var tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
        tooltipTriggerList.forEach(function (tooltipTriggerEl) {
            new bootstrap.Tooltip(tooltipTriggerEl)
        })
    })()
</script>

</body>

<?php $this->load->view('templates/FHC-Footer'); ?>
