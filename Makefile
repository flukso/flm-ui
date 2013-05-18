USER=root
HOST=192.168.255.1

INDEX=index.html

BOOTSTRAP_CSS=styles/bootstrap.css
MAIN_CSS=styles/main.css

IMG=img/flukso.logo.png

NG_JS=components/angular/angular.min.js
NG_RESOURCE_JS=components/angular-resource/angular-resource.js
NG_COOKIES_JS=components/angular-cookies/angular-cookies.js
NG_SANITIZE_JS=components/angular-sanitize/angular-sanitize.js
NG_BOOTSTRAP_JS=components/angular-bootstrap/ui-bootstrap-tpls.min.js

APP_JS=scripts/app.js
MAIN_JS=scripts/controllers/main.js
SENSOR_JS=scripts/controllers/sensor.js
WIFI_JS=scripts/controllers/wifi.js
STATUS_JS=scripts/controllers/status.js
SERVICES_JS=scripts/controllers/services.js
SYSLOG_JS=scripts/controllers/syslog.js

MAIN_HTML=views/main.html
SENSOR_HTML=views/sensor.html
WIFI_HTML=views/wifi.html
STATUS_HTML=views/status.html
SERVICES_HTML=views/services.html
SYSLOG_HTML=views/syslog.html

init:
	@ssh $(USER)@$(HOST) mkdir -p \
		/www/styles \
		/www/views \
		/www/img \
		/www/scripts/controllers \
		/www/components/angular \
		/www/components/angular-resource \
		/www/components/angular-cookies \
		/www/components/angular-sanitize \
		/www/components/angular-bootstrap
	@scp app/$(BOOTSTRAP_CSS) $(USER)@$(HOST):/www/$(BOOTSTRAP_CSS)
	@scp app/$(IMG) $(USER)@$(HOST):/www/$(IMG)
	@scp app/$(NG_JS) $(USER)@$(HOST):/www/$(NG_JS)
	@scp app/$(NG_RESOURCE_JS) $(USER)@$(HOST):/www/$(NG_RESOURCE_JS)
	@scp app/$(NG_COOKIES_JS) $(USER)@$(HOST):/www/$(NG_COOKIES_JS)
	@scp app/$(NG_SANITIZE_JS) $(USER)@$(HOST):/www/$(NG_SANITIZE_JS)
	@scp app/$(NG_BOOTSTRAP_JS) $(USER)@$(HOST):/www/$(NG_BOOTSTRAP_JS)

load:
	@scp app/$(INDEX) $(USER)@$(HOST):/www/$(INDEX)
	@scp app/$(MAIN_CSS) $(USER)@$(HOST):/www/$(MAIN_CSS)
	@scp app/$(APP_JS) $(USER)@$(HOST):/www/$(APP_JS)
	@scp app/$(MAIN_JS) $(USER)@$(HOST):/www/$(MAIN_JS)
	@scp app/$(SENSOR_JS) $(USER)@$(HOST):/www/$(SENSOR_JS)
	@scp app/$(WIFI_JS) $(USER)@$(HOST):/www/$(WIFI_JS)
	@scp app/$(STATUS_JS) $(USER)@$(HOST):/www/$(STATUS_JS)
	@scp app/$(SERVICES_JS) $(USER)@$(HOST):/www/$(SERVICES_JS)
	@scp app/$(SYSLOG_JS) $(USER)@$(HOST):/www/$(SYSLOG_JS)
	@scp app/$(MAIN_HTML) $(USER)@$(HOST):/www/$(MAIN_HTML)
	@scp app/$(SENSOR_HTML) $(USER)@$(HOST):/www/$(SENSOR_HTML)
	@scp app/$(WIFI_HTML) $(USER)@$(HOST):/www/$(WIFI_HTML)
	@scp app/$(STATUS_HTML) $(USER)@$(HOST):/www/$(STATUS_HTML)
	@scp app/$(SERVICES_HTML) $(USER)@$(HOST):/www/$(SERVICES_HTML)
	@scp app/$(SYSLOG_HTML) $(USER)@$(HOST):/www/$(SYSLOG_HTML)
