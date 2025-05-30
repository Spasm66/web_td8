# Définir le host
export PGHOST=/tmp/$LOGNAME
# Définir le port
export PGPORT=$UID

/usr/lib/postgresql/15/bin/pg_ctl -D $PGHOST -l /tmp/$LOGNAME/startup.log
start
pg_conftool -v /tmp/$LOGNAME/postgresql.conf set unix_socket_directories/tmp/$LOGNAME/
