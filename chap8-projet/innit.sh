export PGHOST=/tmp/$LOGNAME/
export PGPORT=$UID
/usr/lib/postgresql/14/bin/pg_ctl -D $PGHOST -l /tmp/$LOGNAME/startup.log initdb

pg_conftool -v /etc/postgresql/14/main/postgresql.conf set unix_socket_directories $PGHOST

#psql -d postgres
#ECHO $UID