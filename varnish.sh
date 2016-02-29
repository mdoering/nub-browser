pkill varnishd
/usr/local/sbin/varnishd -f default.vcl -s malloc,1G -T 127.0.0.1:2000 -a 127.0.0.1:8080
