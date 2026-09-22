'use strict';

define('admin/plugins/ieu-erasmus', ['settings', 'alerts', 'api'], function (settings, alerts, api) {
	const ACP = {};

	ACP.init = function () {
		settings.load('ieu-erasmus', $('.ieu-erasmus-settings'));

		$('#save').on('click', function () {
			settings.save('ieu-erasmus', $('.ieu-erasmus-settings'), function () {
				alerts.success('Ayarlar kaydedildi. Veri arka planda yeniden kontrol ediliyor.');
			});
		});

		$('#refresh').on('click', function () {
			const btn = $(this).prop('disabled', true);
			api.post('/plugins/ieu-erasmus/refresh', {}).then((res) => {
				if (res && res.error) {
					alerts.error(`Kontrol başarısız: ${res.error}`);
				} else {
					alerts.success(`Veri güncel: ${(res && res.term) || ''}`);
					ajaxify.refresh();
				}
			}).catch(alerts.error).finally(() => btn.prop('disabled', false));
		});
	};

	return ACP;
});
