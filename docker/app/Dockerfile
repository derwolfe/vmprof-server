FROM gliderlabs/alpine:3.2

RUN apk add --update \
    python \
    python-dev \
    py-pip \
    postgresql-dev \
    alpine-sdk \
    uwsgi \
  && pip install virtualenv \
  && rm -rf /var/cache/apk/*

RUN mkdir -p /var/www/vmprof

COPY ../../ /var/www/vmprof

RUN virtualenv /virtualenv && \
    /virtualenv/bin/pip install --upgrade pip && \
    /virtualenv/bin/pip install -r /var/www/vmprof/requirements/docker.txt

# RUN mkdir -p /var/www/vmprof/static

# ENV DJANGO_SETTINGS_MODULE=settings.docker

# CMD cd /var/www/vmprof/static && \
#     /virtualenv/bin/python /var/www/vmprof/manage.py collectstatic -c --noinput && \
#     /virtualenv/bin/python /var/www/vmprof/manage.py migrate && \
#     uwsgi --ini /var/www/uwsgi.ini

EXPOSE 8888

ENTRYPOINT ["/virtualenv/bin/python", "/var/www/vmprof/tweb.py"]
