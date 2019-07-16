import {
  Injectable,
  Host,
  Optional,
  SkipSelf,
  Output,
  OnInit,
  AfterContentInit,
  OnChanges,
  Component,
  ElementRef,
  forwardRef
} from '@angular/core';
import { base } from './base';
export class datepanelMetaData {
  public static XTYPE: string = 'datepanel';
    public static PROPERTIESOBJECT: string[] = [
    "activeChildTabIndex": "Number",
    "activeItem": "Ext.Component/Object/String/Number",
    "allowFocusingDisabledChildren": "Boolean",
    "alwaysOnTop": "Boolean/Number",
    "anchor": "Boolean",
    "anchorPosition": "String",
    "animation": "Boolean",
    "ariaAttributes": "Object",
    "ariaDescribedBy": "String",
    "ariaLabel": "String",
    "ariaLabelledBy": "String",
    "autoConfirm": "Boolean",
    "autoDestroy": "Boolean",
    "autoSize": "Boolean",
    "axisLock": "Boolean",
    "bbar": "Object/Object[]",
    "bind": "Object/String",
    "bodyBorder": "Boolean",
    "bodyPadding": "Number/Boolean/String",
    "bodyStyle": "String/Object",
    "border": "Boolean",
    "bottom": "Number/String",
    "buttonAlign": "String",
    "buttons": "Object/Ext.Button[]",
    "buttonToolbar": "Object/Ext.Toolbar",
    "captionFormat": "String",
    "cardSwitchAnimation": "String/Object/Boolean",
    "centered": "Boolean",
    "closable": "Boolean",
    "closeAction": "String",
    "closeToolText": "String",
    "cls": "String/String[]",
    "collapsed": "Boolean",
    "collapsible": "'top'/'right'/'bottom'/'left'/Boolean/Object",
    "constrainAlign": "String/Ext.util.Region/Ext.dom.Element",
    "contentEl": "Ext.dom.Element/HTMLElement/String",
    "control": "Object",
    "controller": "String/Object/Ext.app.ViewController",
    "data": "Object",
    "dateCellFormat": "String",
    "defaultFocus": "String",
    "defaultListenerScope": "Boolean",
    "defaults": "Object",
    "defaultToolWeights": "Object",
    "defaultType": "String",
    "disabled": "Boolean",
    "disabledDates": "Date[]/String[]/RegExp",
    "disabledDays": "Number[]",
    "displayed": "Boolean",
    "docked": "String",
    "draggable": "Boolean/Object/Ext.drag.Source",
    "flex": "Number/String/Object",
    "floated": "Boolean",
    "focusableContainer": "Boolean",
    "focusableDate": "Date",
    "focusCls": "String",
    "format": "String",
    "fullscreen": "Boolean",
    "handler": "Function",
    "header": "Boolean/Object",
    "headerFormat": "String",
    "headerLength": "Number",
    "headerPosition": "'top'/'right'/'bottom'/'left'",
    "height": "Number/String",
    "hidden": "Boolean",
    "hideAnimation": "String/Mixed",
    "hideCaptions": "Boolean",
    "hideMode": "'clip'/'display'/'offsets'/'opacity'/'visibility'",
    "hideOnMaskTap": "Boolean",
    "hideOutside": "Boolean",
    "html": "String/Ext.dom.Element/HTMLElement",
    "icon": "String",
    "iconAlign": "'top'/'right'/'bottom'/'left'",
    "iconCls": "String",
    "id": "String",
    "inactiveChildTabIndex": "Number",
    "innerCls": "String",
    "instanceCls": "String/String[]",
    "itemId": "String",
    "items": "Array/Object",
    "keyMap": "Object",
    "keyMapEnabled": "Boolean",
    "keyMapTarget": "String",
    "layout": "Object/String",
    "lbar": "Object/Object[]",
    "left": "Number/String",
    "listeners": "Object",
    "manageBorders": "Boolean",
    "margin": "Number/String",
    "masked": "Boolean/String/Object/Ext.Mask/Ext.LoadMask",
    "maxDate": "Date/String",
    "maxHeight": "Number/String",
    "maxWidth": "Number/String",
    "minButtonWidth": "Number",
    "minDate": "Date/String",
    "minHeight": "Number/String",
    "minWidth": "Number/String",
    "modal": "Boolean",
    "modelValidation": "Boolean",
    "name": "String",
    "nameable": "Boolean",
    "nameHolder": "Boolean",
    "navigationPosition": "'header'/'caption'",
    "nextText": "String",
    "padding": "Number/String",
    "panes": "Number",
    "plugins": "Array/Ext.enums.Plugin/Object/Ext.plugin.Abstract",
    "prevText": "String",
    "publishes": "String/String[]/Object",
    "rbar": "Object/Object[]",
    "record": "Ext.data.Model",
    "reference": "String",
    "referenceHolder": "Boolean",
    "relative": "Boolean",
    "renderTo": "Ext.dom.Element",
    "resetFocusPosition": "Boolean",
    "resizable": "Object",
    "right": "Number/String",
    "ripple": "Boolean/Object/String",
    "scope": "Object",
    "scrollable": "Boolean/String/Object",
    "selectOnNavigate": "Boolean",
    "selfAlign": "String",
    "session": "Boolean/Object/Ext.data.Session",
    "shadow": "Boolean",
    "shareableName": "Boolean",
    "shim": "Boolean",
    "showAfterMaxDate": "Boolean",
    "showAnimation": "String/Mixed",
    "showBeforeMinDate": "Boolean",
    "showFooter": "Boolean",
    "showTodayButton": "Boolean",
    "specialDates": "Date[]/String[]/RegExp[]",
    "specialDays": "Number[]",
    "splitTitle": "Boolean",
    "standardButtons": "Object",
    "startDay": "Number",
    "stateful": "Boolean/Object/String[]",
    "statefulDefaults": "Object/String[]",
    "stateId": "String",
    "style": "String/Object",
    "tabIndex": "Number",
    "tbar": "Object/Object[]",
    "title": "String/Ext.panel.Title",
    "titleAlign": "'left'/'center'/'right'",
    "titleAnimation": "Boolean/Object",
    "toFrontOnShow": "Boolean",
    "toolDefaults": "Object",
    "tools": "Ext.Tool[]/Object/Object[]",
    "tooltip": "String/Object",
    "top": "Number/String",
    "touchAction": "Object",
    "tpl": "String/String[]/Ext.Template/Ext.XTemplate[]",
    "tplWriteMode": "String",
    "transformCellCls": "Function",
    "translatable": "Object",
    "twoWayBindable": "String/String[]/Object",
    "ui": "String/String[]",
    "userCls": "String/String[]",
    "userSelectable": "Boolean/String/Object",
    "value": "Date",
    "viewModel": "String/Object/Ext.app.ViewModel",
    "weekendDays": "Number[]",
    "weight": "Number",
    "weighted": "Boolean",
    "width": "Number/String",
    "x": "Number",
    "xtype": "String",
    "y": "Number",
    "yearPicker": "Object",
    "yearPickerDefaults": "Object",
    "zIndex": "Number",
    "platformConfig": "Object",
    "responsiveConfig": "Object",
    "align": "Obyect",
    "fitToParent": "Boolean",
    "config": "Object",
];
  public static PROPERTIES: string[] = [
    'activeChildTabIndex',
    'activeItem',
    'allowFocusingDisabledChildren',
    'alwaysOnTop',
    'anchor',
    'anchorPosition',
    'animation',
    'ariaAttributes',
    'ariaDescribedBy',
    'ariaLabel',
    'ariaLabelledBy',
    'autoConfirm',
    'autoDestroy',
    'autoSize',
    'axisLock',
    'bbar',
    'bind',
    'bodyBorder',
    'bodyPadding',
    'bodyStyle',
    'border',
    'bottom',
    'buttonAlign',
    'buttons',
    'buttonToolbar',
    'captionFormat',
    'cardSwitchAnimation',
    'centered',
    'closable',
    'closeAction',
    'closeToolText',
    'cls',
    'collapsed',
    'collapsible',
    'constrainAlign',
    'contentEl',
    'control',
    'controller',
    'data',
    'dateCellFormat',
    'defaultFocus',
    'defaultListenerScope',
    'defaults',
    'defaultToolWeights',
    'defaultType',
    'disabled',
    'disabledDates',
    'disabledDays',
    'displayed',
    'docked',
    'draggable',
    'flex',
    'floated',
    'focusableContainer',
    'focusableDate',
    'focusCls',
    'format',
    'fullscreen',
    'handler',
    'header',
    'headerFormat',
    'headerLength',
    'headerPosition',
    'height',
    'hidden',
    'hideAnimation',
    'hideCaptions',
    'hideMode',
    'hideOnMaskTap',
    'hideOutside',
    'html',
    'icon',
    'iconAlign',
    'iconCls',
    'id',
    'inactiveChildTabIndex',
    'innerCls',
    'instanceCls',
    'itemId',
    'items',
    'keyMap',
    'keyMapEnabled',
    'keyMapTarget',
    'layout',
    'lbar',
    'left',
    'listeners',
    'manageBorders',
    'margin',
    'masked',
    'maxDate',
    'maxHeight',
    'maxWidth',
    'minButtonWidth',
    'minDate',
    'minHeight',
    'minWidth',
    'modal',
    'modelValidation',
    'name',
    'nameable',
    'nameHolder',
    'navigationPosition',
    'nextText',
    'padding',
    'panes',
    'plugins',
    'prevText',
    'publishes',
    'rbar',
    'record',
    'reference',
    'referenceHolder',
    'relative',
    'renderTo',
    'resetFocusPosition',
    'resizable',
    'right',
    'ripple',
    'scope',
    'scrollable',
    'selectOnNavigate',
    'selfAlign',
    'session',
    'shadow',
    'shareableName',
    'shim',
    'showAfterMaxDate',
    'showAnimation',
    'showBeforeMinDate',
    'showFooter',
    'showTodayButton',
    'specialDates',
    'specialDays',
    'splitTitle',
    'standardButtons',
    'startDay',
    'stateful',
    'statefulDefaults',
    'stateId',
    'style',
    'tabIndex',
    'tbar',
    'title',
    'titleAlign',
    'titleAnimation',
    'toFrontOnShow',
    'toolDefaults',
    'tools',
    'tooltip',
    'top',
    'touchAction',
    'tpl',
    'tplWriteMode',
    'transformCellCls',
    'translatable',
    'twoWayBindable',
    'ui',
    'userCls',
    'userSelectable',
    'value',
    'viewModel',
    'weekendDays',
    'weight',
    'weighted',
    'width',
    'x',
    'xtype',
    'y',
    'yearPicker',
    'yearPickerDefaults',
    'zIndex',
    'platformConfig',
    'responsiveConfig',
    'align',
    'fitToParent',
    'config'
];
  public static EVENTS: any[] = [
		{name:'activate',parameters:'newActiveItem,datepanel,oldActiveItem'},
		{name:'activeItemchange',parameters:'sender,value,oldValue'},
		{name:'add',parameters:'datepanel,item,index'},
		{name:'added',parameters:'sender,container,index'},
		{name:'beforeactiveItemchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforebottomchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforecenteredchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforecollapse',parameters:'datepanel'},
		{name:'beforedisabledchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforedockedchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforeexpand',parameters:'datepanel'},
		{name:'beforeheightchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforehiddenchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforehide',parameters:'sender'},
		{name:'beforeleftchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforemaxHeightchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforemaxWidthchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforeminHeightchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforeminWidthchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforeorientationchange',parameters:''},
		{name:'beforeresizedragstart',parameters:'datepanel,context'},
		{name:'beforerightchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforescrollablechange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforeshow',parameters:'sender'},
		{name:'beforetofront',parameters:'datepanel'},
		{name:'beforetopchange',parameters:'sender,value,oldValue,undefined'},
		{name:'beforewidthchange',parameters:'sender,value,oldValue,undefined'},
		{name:'blur',parameters:'datepanel,event'},
		{name:'bottomchange',parameters:'sender,value,oldValue'},
		{name:'centeredchange',parameters:'sender,value,oldValue'},
		{name:'collapse',parameters:'datepanel'},
		{name:'deactivate',parameters:'oldActiveItem,datepanel,newActiveItem'},
		{name:'destroy',parameters:''},
		{name:'disabledchange',parameters:'sender,value,oldValue'},
		{name:'dockedchange',parameters:'sender,value,oldValue'},
		{name:'drawerhide',parameters:'datepanel'},
		{name:'drawershow',parameters:'datepanel'},
		{name:'erased',parameters:'sender'},
		{name:'expand',parameters:'datepanel'},
		{name:'floatingchange',parameters:'sender,positioned'},
		{name:'focus',parameters:'datepanel,event'},
		{name:'focusenter',parameters:'datepanel,event'},
		{name:'focusleave',parameters:'datepanel,event'},
		{name:'fullscreen',parameters:'sender'},
		{name:'heightchange',parameters:'sender,value,oldValue'},
		{name:'hiddenchange',parameters:'sender,value,oldValue'},
		{name:'hide',parameters:'sender'},
		{name:'initialize',parameters:'sender'},
		{name:'leftchange',parameters:'sender,value,oldValue'},
		{name:'maxHeightchange',parameters:'sender,value,oldValue'},
		{name:'maxWidthchange',parameters:'sender,value,oldValue'},
		{name:'minHeightchange',parameters:'sender,value,oldValue'},
		{name:'minWidthchange',parameters:'sender,value,oldValue'},
		{name:'move',parameters:'datepanel,item,toIndex,fromIndex'},
		{name:'moved',parameters:'sender,container,toIndex,fromIndex'},
		{name:'orientationchange',parameters:''},
		{name:'painted',parameters:'sender,element'},
		{name:'positionedchange',parameters:'sender,positioned'},
		{name:'remove',parameters:'datepanel,item,index'},
		{name:'removed',parameters:'sender,container,index'},
		{name:'renderedchange',parameters:'datepanel,item,rendered'},
		{name:'resize',parameters:'element,info'},
		{name:'resizedrag',parameters:'datepanel,context'},
		{name:'resizedragcancel',parameters:'datepanel,context'},
		{name:'resizedragend',parameters:'datepanel,context'},
		{name:'resizedragstart',parameters:'datepanel,context'},
		{name:'rightchange',parameters:'sender,value,oldValue'},
		{name:'scrollablechange',parameters:'sender,value,oldValue'},
		{name:'show',parameters:'sender'},
		{name:'tofront',parameters:'datepanel'},
		{name:'topchange',parameters:'sender,value,oldValue'},
		{name:'updatedata',parameters:'sender,newData'},
		{name:'widthchange',parameters:'sender,value,oldValue'},
		{name:'ready',parameters:''}
];
  public static EVENTNAMES: string[] = [
		'activate',
		'activeItemchange',
		'add',
		'added',
		'beforeactiveItemchange',
		'beforebottomchange',
		'beforecenteredchange',
		'beforecollapse',
		'beforedisabledchange',
		'beforedockedchange',
		'beforeexpand',
		'beforeheightchange',
		'beforehiddenchange',
		'beforehide',
		'beforeleftchange',
		'beforemaxHeightchange',
		'beforemaxWidthchange',
		'beforeminHeightchange',
		'beforeminWidthchange',
		'beforeorientationchange',
		'beforeresizedragstart',
		'beforerightchange',
		'beforescrollablechange',
		'beforeshow',
		'beforetofront',
		'beforetopchange',
		'beforewidthchange',
		'blur',
		'bottomchange',
		'centeredchange',
		'collapse',
		'deactivate',
		'destroy',
		'disabledchange',
		'dockedchange',
		'drawerhide',
		'drawershow',
		'erased',
		'expand',
		'floatingchange',
		'focus',
		'focusenter',
		'focusleave',
		'fullscreen',
		'heightchange',
		'hiddenchange',
		'hide',
		'initialize',
		'leftchange',
		'maxHeightchange',
		'maxWidthchange',
		'minHeightchange',
		'minWidthchange',
		'move',
		'moved',
		'orientationchange',
		'painted',
		'positionedchange',
		'remove',
		'removed',
		'renderedchange',
		'resize',
		'resizedrag',
		'resizedragcancel',
		'resizedragend',
		'resizedragstart',
		'rightchange',
		'scrollablechange',
		'show',
		'tofront',
		'topchange',
		'updatedata',
		'widthchange',
		'ready'
];
}
@Component({
  selector: 'datepanel', 
  inputs: datepanelMetaData.PROPERTIES,
  outputs: datepanelMetaData.EVENTNAMES,
  providers: [{provide: base, useExisting: forwardRef(() => ExtDatepanelComponent)}],
  template: '<ng-template></ng-template>'
})
export class ExtDatepanelComponent extends base implements OnInit,AfterContentInit,OnChanges {
  constructor(
    eRef:ElementRef, @Host() @Optional() @SkipSelf() public hostComponent : base) {
      super(eRef.nativeElement,datepanelMetaData,hostComponent)
    }
  public ngOnInit() {
    this.baseOnInit(datepanelMetaData)
  }
  public ngAfterContentInit() {
    this.baseAfterContentInit()
    //this['ready'].emit(this)
  }
  //public ngOnChanges(changes: SimpleChanges) {this.baseOnChanges(changes)}

}