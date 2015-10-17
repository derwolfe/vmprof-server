# vmprof


Virtual Machine profiler (so far restricted to pypy and cpython)


## development

	apt-get install gcc python-dev postgresql-9.X postgresql-server-dev-9.X

    pip install -r requirements/development.txt

    python manage.py syncdb --noinput
    python manage.py migrate

	python manage.py runserver

edit /etc/postgresql/9.X/main/pg_hba.conf

	local all postgres trust


	createdb -U postgres vmprof


## test

    py.test tests/

## deployment

    fab deploy -H vmprof.com -u {USER}

## containers

Use containers to run a linked postgres instance.
Docker compose will be responsible for building and starting both containers.
