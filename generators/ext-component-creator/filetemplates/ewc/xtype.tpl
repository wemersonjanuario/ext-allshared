import {classname} from '{folder}'

export class Ext{Xtype}Component extends {classname} {

    constructor() {
        super (
            '',
            '',
            {},
            ''
        )
        console.log('{xtype}')
    }

}

(function () {
    Ext.onReady(function() {
        window.customElements.define('ext-{xtype}', Ext{Xtype}Component);
    });
})();
