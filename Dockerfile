FROM gliderlabs/alpine:3.2
MAINTAINER Chris Wolfe

RUN apk add --update \
    python \
    python-dev \
    py-pip \
    build-base \
    nginx \
  && pip install virtualenv \
  && rm -rf /var/cache/apk/*

#WORKDIR /var/www/vmprof
RUN mkdir -p /var/www/vmprof

COPY . /var/www/vmprof

# setup nginx
RUN ln -s /var/www/vmprof/nginx.conf /etc/nginx/sites-enabled/

RUN virtualenv /virtualenv && \
    /virtualenv/bin/pip install --upgrade pip && \
    /virtualenv/bin/pip install uwsgi && \
    /virtualenv/bin/pip install -r vmprof/requirements/production.txt

RUN mkdir -p /var/www/vmprof/static

RUN cd /var/www/vmprof/static && \
    virtualenv/vmprof/manage.py collectstatic -c --noinput && \
    virtualenv/vmprof/manage.py migrate && \
    virtualenv/bin/uwsgi--ini vmprof/uwsgi.ini

# nginx also needs to get going!.

# start nginx
EXPOSE 8888
CMD /bin/sh
