/* rowchildren.js

	Purpose:
		
	Description:
		
	History:
		Thu, Jan 24, 2013  12:40:19 PM, Created by Neil

Copyright (C) 2013 Potix Corporation. All Rights Reserved.

*/

function(out) {
	out.push('<div ', this.domAttrs_(), '>');
	for (var w = this.firstChild; w; w = w.nextSibling)
		w.redraw(out);
	out.push('</div>');
}