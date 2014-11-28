FROM dockerfile/nodejs
MAINTAINER Jordan Li
ADD ./* /data/
RUN npm install
ADD run.sh /usr/bin/run
RUN chmod u+x /usr/bin/run
CMD run