
all: index.js index.css

clean:
	rm -f index.js index.css

%.js : %.main.ts lib/*.ts
	tsc --out $@ --removeComments $<

%.css : %.main.scss
	sass --no-cache --style=compressed $< $@