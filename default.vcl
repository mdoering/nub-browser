vcl 4.0;

backend prod {
    .host = "api.gbif.org";
    .port = "80";
}
backend uat {
    .host = "api.gbif-uat.org";
    .port = "80";
}

sub vcl_recv {
  if (req.url ~ "^/uat/"){
    set req.url = regsub(req.url, "^/uat/", "/v1/");
    set req.http.host = "api.gbif-uat.org";
    set req.backend_hint = uat;
  } else {
    set req.url = regsub(req.url, "^/", "/v1/");
    set req.http.host = "api.gbif.org";
    set req.backend_hint = prod;
  }
  return (hash);
}

sub vcl_backend_response {
  # 1 week
  set beresp.ttl = 168h;
  return (deliver);  
}

