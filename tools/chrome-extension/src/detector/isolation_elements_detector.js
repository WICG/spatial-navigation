var ret_val = Array();
var res = isolation_detector();
if (res < 0) ret_val = -res;
else {
    //var res = document.body.focusableAreas({'mode': 'all'});
    for (i = 0; i < res.length; i++) {
        ret_val[i] = res[i].outerHTML;
    }
}
ret_val;