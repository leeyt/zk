package org.zkoss.zktest.test2;
import java.math.BigDecimal;

import org.zkoss.zk.ui.event.Event;
import org.zkoss.zk.ui.ext.AfterCompose;
import org.zkoss.zk.ui.util.ConventionWires;
import org.zkoss.zul.Decimalbox;
import org.zkoss.zul.Window;

@SuppressWarnings("serial")
public class B65_ZK_1585_TestDecimalbox extends Window implements AfterCompose {
	private Window finestraIndex;
	private Decimalbox decimal;

	public void onCreate$finestraIndex(Event event) {
		decimal.setValue(new BigDecimal("125.76"));
	}

	public void afterCompose() {
		ConventionWires.wireVariables(this, this);
		ConventionWires.addForwards(this, this);
	}
}
