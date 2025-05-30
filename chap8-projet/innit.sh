export PGHOST=/tmp/$LOGNAME/
export PGPORT=$UID
/usr/lib/postgresql/15/bin/initdb -D /tmp/$LOGNAME/
/usr/lib/postgresql/15/bin/pg_conftool -v /tmp/$LOGNAME/postgresql.conf set unix_socket_directories /tmp/$LOGNAME/#psql -d postgres
#ECHO $UID



