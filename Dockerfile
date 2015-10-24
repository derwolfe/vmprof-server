FROM gliderlabs/alpine:3.2

RUN apk add --update \
    python \
    python-dev \
    py-pip \
    postgresql-dev \
    alpine-sdk \
  && pip install virtualenv \
  && rm -rf /var/cache/apk/*

RUN mkdir -p /var/www/vmprof

COPY . /var/www/vmprof

RUN virtualenv /virtualenv && \
    /virtualenv/bin/pip install --upgrade pip && \
    /virtualenv/bin/pip install -r /var/www/vmprof/requirements/docker.txt

RUN mkdir -p /var/www/vmprof/static

ENV DJANGO_SETTINGS_MODULE=settings.docker

RUN cd /var/www/vmprof/static && \
    /virtualenv/bin/python /var/www/vmprof/manage.py collectstatic -c --noinput && \
    /virtualenv/bin/python /var/www/vmprof/manage.py syncdb && \
    /virtualenv/bin/python /var/www/vmprof/manage.py migrate && \
    /virtualenv/bin/twistd web --port 8888 --wsgi /var/www/vmprof/server/wsgi.py

# start nginx
EXPOSE 8888
CMD /bin/sh
