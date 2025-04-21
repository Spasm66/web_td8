#taper des commandes sql
# Définir le host
export PGHOST=/tmp/$LOGNAME
# Définir le port
export PGPORT=$UID

psql -d postgres