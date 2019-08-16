var ret_val = Array();
var res = loop_detector();

if (res < 0) ret_val = res;
else {

    direction = ["Loop elments in Up direction", "Loop elments in down direction", "Loop elments in left direction", "Loop elments in right direction"];

    for (j = 0; j < 4; j++) {
        ret_val.push("</xmp>" + "<br><h2>" + direction[j] + "</h2><hr>" + "<xmp>");

        var each_direction_loop_result = res[j];

        for (i = 0; i < each_direction_loop_result.length; i++) {
            ret_val.push(each_direction_loop_result[i].outerHTML);
        }
    }

}
ret_val;