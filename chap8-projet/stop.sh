# Définir le host
export PGHOST=/tmp/$LOGNAME
# Définir le port
export PGPORT=$UID

/usr/lib/postgresql/14/bin/pg_ctl -D /tmp/$LOGNAME/ -l /tmp/$LOGNAME/startup.log stop
