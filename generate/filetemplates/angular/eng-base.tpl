declare var Ext: any
//import 'script-loader!../ext/ext.{name}.prod';
//import 'script-loader!../ext/css.prod';
//import 'script-loader!@sencha/ext-angular{bundle}/ext/ext.{type}.prod';
//import 'script-loader!@sencha/ext-angular{bundle}/ext/css.prod';
//import Common from './Common'

import {
    EventEmitter,
    ContentChild,
    ContentChildren,
    QueryList,
    SimpleChanges
} from '@angular/core'

export class EngBase {
    static count: any = 0;
    static DIRECTION: any = '';

    public ext: any
    newDiv: any

    xtype: any
    properties: any
    propertiesobject: any
    events: any
    eventnames: any


    A: any;
    private node: any
    parentNode: any
    base: any
    nodeName: any

    ewcChildren: any
    rawChildren: any
    hasParent: any
    children: any
    last: any

    @ContentChild('extroute',{ static : false }) _extroute: any;
    @ContentChildren('extroute') _extroutes: QueryList<any>;
    @ContentChild('extitem',{ static : false }) _extitem: any;
    @ContentChildren('extitem') _extitems: QueryList<any>;
    @ContentChildren(EngBase) _childComponents: QueryList<EngBase>;
    get childComponents(): EngBase[] {
        return this._childComponents.filter(item => item !== this);
    }

    constructor (
        nativeElement: any,
        private metaData: any,
        public hostComponent : EngBase,
    ) {
        this.node = nativeElement;
        this.parentNode = hostComponent;

        this.newDiv = document.createElement('div');
        //var t = document.createTextNode("newDiv");
        //this.newDiv.appendChild(t);

        this.node.insertAdjacentElement('beforebegin', this.newDiv);
        this.xtype = metaData.XTYPE;
        this.properties = metaData.PROPERTIES;
        this.propertiesobject = 'propertiesobject';
        this.events = metaData.EVENTS;
        this.eventnames = metaData.EVENTNAMES;

        this.base = EngBase;

        this.eventnames.forEach( (event: any, n: any) => {
            if (event != 'fullscreen') {
                (<any>this.currentEl)[event] = new EventEmitter()
            }
            else {
                (<any>this.currentEl)[event + 'event'] = new EventEmitter()
            }
        })
    }
    baseOnInit(metaData) { }
    baseAfterViewInit(metaData) {
        this.initMe()
    }

{basecode}
{propscode}




    baseOnChanges(changes) {
        //console.log(`ngOnChanges`)
        //console.log(changes)
        let changesMsgs = [];
        for (let propName in changes) {
            let verb = '';
            if (changes[propName].firstChange === true) {
                verb = 'initialized';
            }
            else {
                verb = 'changed';
            }
            let val = changes[propName].currentValue;

            if (this.currentEl.A != undefined) {
                //console.dir(this.currentEl.A.ext)
                var capPropName = propName.charAt(0).toUpperCase() + propName.slice(1);
                var setFunction = 'set' + capPropName;
                //console.log(setFunction)
                if (this.currentEl.A.ext[setFunction] != undefined) {
                    this.currentEl.A.ext[setFunction](val);
                }
                else {
                    console.error(setFunction + ' not found for ' + this.currentEl.A.ext.xtype);
                }
            }
            else {
                if (verb == 'changed') {
                    //mjg console.log('change needed and ext not defined')
                }
            }
            changesMsgs.push(`$ $ to "$"`);
        }
        //console.log(`OnChanges: ${changesMsgs.join('; ')}`)
    }

    ngOnDestroy() {
        var childCmp;
        var parentCmp;
        console.dir(this)
        try {
            childCmp = this.currentEl.A.ext;
            if (this.parentEl != null) {
                parentCmp = this.parentEl.A.ext;
                console.log(childCmp)
                console.log(parentCmp)
                if (childCmp == undefined || parentCmp == undefined)
                    if (parentCmp.xtype == 'button' && childCmp.xtype == 'menu') {
                        //console.log('button/menu not deleted')
                    }
                    else if (parentCmp.xtype == 'carousel') {
                        //console.log('carousel parent not deleted')
                    }
                    else if (parentCmp.xtype == 'grid' && childCmp.xtype == 'column') {
                        //console.log('grid/column not deleted')
                        //console.log(childCmp)
                    }
                    else if (parentCmp.xtype == 'segmentedbutton' && childCmp.xtype == 'button') {
                        //console.log('segmentedbutton/button not deleted')
                    }
                    else if (parentCmp.xtype == 'button' && childCmp.xtype == 'tooltip') {
                        //console.log('button/tooltip not deleted')
                    }
                    else if (parentCmp.xtype == 'titlebar' && childCmp.xtype == 'button') {
                        //console.log('titlebar/button not deleted')
                    }
                    else if (parentCmp.xtype == 'titlebar' && childCmp.xtype == 'searchfield') {
                        //console.log('titlebar/searchfield not deleted')
                    }
                    else {
                        parentCmp.remove([childCmp]);
                        childCmp.destroy();
                    }
            }
            else {
                if (childCmp != undefined) {
                    childCmp.destroy();
                }
                else {
                    console.log('no destroy')
                }
            }
        }
        catch (e) {
            console.error(e);
            //mjg console.log('*****')
            //mjg console.log(parentCmp)
            //mjg console.log(childCmp)
            //mjg console.log('*****')
        }
    }
}