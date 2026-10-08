.PHONY: test pack

test:
	npm test
	npm run check:syntax

pack:
	mkdir -p dist
	gnome-extensions pack src --force --out-dir=dist --extra-source=policy.js
