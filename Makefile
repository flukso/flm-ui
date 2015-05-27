USER=root
HOST=192.168.255.1

INDEX=index.html

BOOTSTRAP_CSS=styles/bootstrap.css
MAIN_CSS=styles/main.css

IMG=img/flukso.logo.png

NG_JS=components/angular/angular.min.js
NG_ROUTE_JS=components/angular-route/angular-route.min.js
NG_BOOTSTRAP_JS=components/angular-bootstrap/ui-bootstrap-tpls.min.js
MQTTWS_JS=components/mqttws/mqttws31-min.js

APP_JS=scripts
APP_HTML=views

info:
	@echo "init:   initialize dir structure on target and transfer framework files"
	@echo "upload: transfer the flm-ui specific files to the target"

init:
	@ssh $(USER)@$(HOST) mkdir -p \
		/www/styles \
		/www/views \
		/www/img \
		/www/scripts/controllers \
		/www/components/angular \
		/www/components/angular-route \
		/www/components/angular-bootstrap \
		/www/components/mqttws
	@scp app/$(BOOTSTRAP_CSS) $(USER)@$(HOST):/www/$(BOOTSTRAP_CSS)
	@scp app/$(IMG) $(USER)@$(HOST):/www/$(IMG)
	@scp app/$(NG_JS) $(USER)@$(HOST):/www/$(NG_JS)
	@scp app/$(NG_ROUTE_JS) $(USER)@$(HOST):/www/$(NG_ROUTE_JS)
	@scp app/$(NG_BOOTSTRAP_JS) $(USER)@$(HOST):/www/$(NG_BOOTSTRAP_JS)
	@scp app/$(MQTTWS_JS) $(USER)@$(HOST):/www/$(MQTTWS_JS)

upload:
	@scp app/$(INDEX) $(USER)@$(HOST):/www/$(INDEX)
	@scp app/$(MAIN_CSS) $(USER)@$(HOST):/www/$(MAIN_CSS)
	@scp -r app/$(APP_JS) $(USER)@$(HOST):/www
	@scp -r app/$(APP_HTML) $(USER)@$(HOST):/www

