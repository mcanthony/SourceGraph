REPORTER=dot

test: node_modules
	@node_modules/mocha/bin/mocha test/*.test.js \
		--reporter $(REPORTER) \
		--bail

node_modules: package.json
	@packin install \
		--meta package.json \
		--folder node_modules

.PHONY: test