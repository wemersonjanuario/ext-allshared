/**
 * @fileoverview added by tsickle
 * @suppress {checkTypes,extraRequire,missingOverride,missingReturn,unusedPrivateMembers,uselessCode} checked by tsc
 */
import { Host, Optional, SkipSelf, Component, ElementRef, forwardRef } from '@angular/core';
import { base } from './base';
export class numbercolumnMetaData {
}
numbercolumnMetaData.XTYPE = 'numbercolumn';
numbercolumnMetaData.PROPERTIES = [
    'activeChildTabIndex',
    'activeItem',
    'align',
    'allowFocusingDisabledChildren',
    'alwaysOnTop',
    'ariaAttributes',
    'ariaDescribedBy',
    'ariaLabel',
    'ariaLabelledBy',
    'autoDestroy',
    'autoSize',
    'axisLock',
    'bind',
    'border',
    'bottom',
    'cardSwitchAnimation',
    'cell',
    'centered',
    'cls',
    'columns',
    'computedWidth',
    'constrainAlign',
    'contentEl',
    'control',
    'controller',
    'data',
    'dataIndex',
    'defaultColumnUI',
    'defaultEditor',
    'defaultFocus',
    'defaultListenerScope',
    'defaults',
    'defaultToolWeights',
    'defaultType',
    'defaultWidth',
    'depends',
    'disabled',
    'displayed',
    'docked',
    'draggable',
    'editable',
    'editor',
    'enterAnimation',
    'eventHandlers',
    'exitAnimation',
    'exportRenderer',
    'exportStyle',
    'exportSummaryRenderer',
    'filter',
    'flex',
    'floated',
    'focusableContainer',
    'focusCls',
    'format',
    'formatter',
    'fullscreen',
    'groupable',
    'grouper',
    'groupHeaderTpl',
    'height',
    'hidden',
    'hideable',
    'hideAnimation',
    'hideMode',
    'hideOnMaskTap',
    'hideShowMenuItem',
    'html',
    'id',
    'ignore',
    'ignoreExport',
    'inactiveChildTabIndex',
    'innerCls',
    'instanceCls',
    'itemId',
    'items',
    'keyMap',
    'keyMapEnabled',
    'keyMapTarget',
    'layout',
    'left',
    'listeners',
    'locked',
    'manageBorders',
    'margin',
    'masked',
    'maxHeight',
    'maxWidth',
    'menu',
    'menuDisabled',
    'minHeight',
    'minWidth',
    'modal',
    'modelValidation',
    'name',
    'nameable',
    'nameHolder',
    'padding',
    'plugins',
    'publishes',
    'record',
    'reference',
    'referenceHolder',
    'relative',
    'renderer',
    'renderTo',
    'reserveScrollbar',
    'resetFocusPosition',
    'resizable',
    'right',
    'ripple',
    'scope',
    'scratchCell',
    'scrollable',
    'selfAlign',
    'session',
    'shadow',
    'shareableName',
    'shim',
    'showAnimation',
    'sortable',
    'sorter',
    'stateful',
    'statefulDefaults',
    'stateId',
    'style',
    'summary',
    'summaryCell',
    'summaryDataIndex',
    'summaryFormatter',
    'summaryRenderer',
    'summaryType',
    'tabIndex',
    'text',
    'toFrontOnShow',
    'toolDefaults',
    'tools',
    'tooltip',
    'top',
    'touchAction',
    'tpl',
    'tplWriteMode',
    'translatable',
    'twoWayBindable',
    'ui',
    'userCls',
    'userSelectable',
    'verticalOverflow',
    'viewModel',
    'weight',
    'weighted',
    'width',
    'x',
    'xtype',
    'y',
    'zIndex',
    'platformConfig',
    'responsiveConfig',
    'align',
    'fitToParent',
    'config'
];
numbercolumnMetaData.EVENTS = [
    { name: 'activate', parameters: 'newActiveItem,numbercolumn,oldActiveItem' },
    { name: 'activeItemchange', parameters: 'sender,value,oldValue' },
    { name: 'add', parameters: 'numbercolumn,item,index' },
    { name: 'added', parameters: 'sender,container,index' },
    { name: 'beforeactiveItemchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforebottomchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforecenteredchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforedisabledchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforedockedchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforeheightchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforehiddenchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforehide', parameters: 'sender' },
    { name: 'beforeleftchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforemaxHeightchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforemaxWidthchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforeminHeightchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforeminWidthchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforeorientationchange', parameters: '' },
    { name: 'beforerightchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforescrollablechange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforeshow', parameters: 'sender' },
    { name: 'beforetofront', parameters: 'numbercolumn' },
    { name: 'beforetopchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'beforewidthchange', parameters: 'sender,value,oldValue,undefined' },
    { name: 'blur', parameters: 'numbercolumn,event' },
    { name: 'bottomchange', parameters: 'sender,value,oldValue' },
    { name: 'centeredchange', parameters: 'sender,value,oldValue' },
    { name: 'deactivate', parameters: 'oldActiveItem,numbercolumn,newActiveItem' },
    { name: 'destroy', parameters: '' },
    { name: 'disabledchange', parameters: 'sender,value,oldValue' },
    { name: 'dockedchange', parameters: 'sender,value,oldValue' },
    { name: 'erased', parameters: 'sender' },
    { name: 'floatingchange', parameters: 'sender,positioned' },
    { name: 'focus', parameters: 'numbercolumn,event' },
    { name: 'focusenter', parameters: 'numbercolumn,event' },
    { name: 'focusleave', parameters: 'numbercolumn,event' },
    { name: 'fullscreen', parameters: 'sender' },
    { name: 'heightchange', parameters: 'sender,value,oldValue' },
    { name: 'hiddenchange', parameters: 'sender,value,oldValue' },
    { name: 'hide', parameters: 'sender' },
    { name: 'initialize', parameters: 'sender' },
    { name: 'leftchange', parameters: 'sender,value,oldValue' },
    { name: 'maxHeightchange', parameters: 'sender,value,oldValue' },
    { name: 'maxWidthchange', parameters: 'sender,value,oldValue' },
    { name: 'minHeightchange', parameters: 'sender,value,oldValue' },
    { name: 'minWidthchange', parameters: 'sender,value,oldValue' },
    { name: 'move', parameters: 'numbercolumn,item,toIndex,fromIndex' },
    { name: 'moved', parameters: 'sender,container,toIndex,fromIndex' },
    { name: 'orientationchange', parameters: '' },
    { name: 'painted', parameters: 'sender,element' },
    { name: 'positionedchange', parameters: 'sender,positioned' },
    { name: 'remove', parameters: 'numbercolumn,item,index' },
    { name: 'removed', parameters: 'sender,container,index' },
    { name: 'renderedchange', parameters: 'numbercolumn,item,rendered' },
    { name: 'resize', parameters: 'element,info' },
    { name: 'rightchange', parameters: 'sender,value,oldValue' },
    { name: 'scrollablechange', parameters: 'sender,value,oldValue' },
    { name: 'show', parameters: 'sender' },
    { name: 'tofront', parameters: 'numbercolumn' },
    { name: 'topchange', parameters: 'sender,value,oldValue' },
    { name: 'updatedata', parameters: 'sender,newData' },
    { name: 'widthchange', parameters: 'sender,value,oldValue' },
    { name: 'ready', parameters: '' }
];
numbercolumnMetaData.EVENTNAMES = [
    'activate',
    'activeItemchange',
    'add',
    'added',
    'beforeactiveItemchange',
    'beforebottomchange',
    'beforecenteredchange',
    'beforedisabledchange',
    'beforedockedchange',
    'beforeheightchange',
    'beforehiddenchange',
    'beforehide',
    'beforeleftchange',
    'beforemaxHeightchange',
    'beforemaxWidthchange',
    'beforeminHeightchange',
    'beforeminWidthchange',
    'beforeorientationchange',
    'beforerightchange',
    'beforescrollablechange',
    'beforeshow',
    'beforetofront',
    'beforetopchange',
    'beforewidthchange',
    'blur',
    'bottomchange',
    'centeredchange',
    'deactivate',
    'destroy',
    'disabledchange',
    'dockedchange',
    'erased',
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
    'rightchange',
    'scrollablechange',
    'show',
    'tofront',
    'topchange',
    'updatedata',
    'widthchange',
    'ready'
];
if (false) {
    /** @type {?} */
    numbercolumnMetaData.XTYPE;
    /** @type {?} */
    numbercolumnMetaData.PROPERTIES;
    /** @type {?} */
    numbercolumnMetaData.EVENTS;
    /** @type {?} */
    numbercolumnMetaData.EVENTNAMES;
}
export class ExtNumbercolumnComponent extends base {
    /**
     * @param {?} eRef
     * @param {?} hostComponent
     */
    constructor(eRef, hostComponent) {
        super(eRef.nativeElement, numbercolumnMetaData, hostComponent);
        this.hostComponent = hostComponent;
    }
    /**
     * @return {?}
     */
    ngOnInit() {
        this.baseOnInit(numbercolumnMetaData);
    }
    /**
     * @return {?}
     */
    ngAfterContentInit() {
        this.baseAfterContentInit();
        //this['ready'].emit(this)
    }
}
ExtNumbercolumnComponent.decorators = [
    { type: Component, args: [{
                selector: 'numbercolumn',
                inputs: numbercolumnMetaData.PROPERTIES,
                outputs: numbercolumnMetaData.EVENTNAMES,
                providers: [{ provide: base, useExisting: forwardRef((/**
                         * @return {?}
                         */
                        () => ExtNumbercolumnComponent)) }],
                template: '<ng-template></ng-template>'
            }] }
];
/** @nocollapse */
ExtNumbercolumnComponent.ctorParameters = () => [
    { type: ElementRef },
    { type: base, decorators: [{ type: Host }, { type: Optional }, { type: SkipSelf }] }
];
if (false) {
    /** @type {?} */
    ExtNumbercolumnComponent.prototype.hostComponent;
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXh0LW51bWJlcmNvbHVtbi5jb21wb25lbnQuanMiLCJzb3VyY2VSb290Ijoibmc6Ly9Ac2VuY2hhL2V4dC1hbmd1bGFyLyIsInNvdXJjZXMiOlsibGliL2V4dC1udW1iZXJjb2x1bW4uY29tcG9uZW50LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7QUFBQSxPQUFPLEVBRUwsSUFBSSxFQUNKLFFBQVEsRUFDUixRQUFRLEVBS1IsU0FBUyxFQUNULFVBQVUsRUFDVixVQUFVLEVBQ1gsTUFBTSxlQUFlLENBQUM7QUFDdkIsT0FBTyxFQUFFLElBQUksRUFBRSxNQUFNLFFBQVEsQ0FBQztBQUM5QixNQUFNLE9BQU8sb0JBQW9COztBQUNqQiwwQkFBSyxHQUFXLGNBQWMsQ0FBQztBQUMvQiwrQkFBVSxHQUFhO0lBQ25DLHFCQUFxQjtJQUNyQixZQUFZO0lBQ1osT0FBTztJQUNQLCtCQUErQjtJQUMvQixhQUFhO0lBQ2IsZ0JBQWdCO0lBQ2hCLGlCQUFpQjtJQUNqQixXQUFXO0lBQ1gsZ0JBQWdCO0lBQ2hCLGFBQWE7SUFDYixVQUFVO0lBQ1YsVUFBVTtJQUNWLE1BQU07SUFDTixRQUFRO0lBQ1IsUUFBUTtJQUNSLHFCQUFxQjtJQUNyQixNQUFNO0lBQ04sVUFBVTtJQUNWLEtBQUs7SUFDTCxTQUFTO0lBQ1QsZUFBZTtJQUNmLGdCQUFnQjtJQUNoQixXQUFXO0lBQ1gsU0FBUztJQUNULFlBQVk7SUFDWixNQUFNO0lBQ04sV0FBVztJQUNYLGlCQUFpQjtJQUNqQixlQUFlO0lBQ2YsY0FBYztJQUNkLHNCQUFzQjtJQUN0QixVQUFVO0lBQ1Ysb0JBQW9CO0lBQ3BCLGFBQWE7SUFDYixjQUFjO0lBQ2QsU0FBUztJQUNULFVBQVU7SUFDVixXQUFXO0lBQ1gsUUFBUTtJQUNSLFdBQVc7SUFDWCxVQUFVO0lBQ1YsUUFBUTtJQUNSLGdCQUFnQjtJQUNoQixlQUFlO0lBQ2YsZUFBZTtJQUNmLGdCQUFnQjtJQUNoQixhQUFhO0lBQ2IsdUJBQXVCO0lBQ3ZCLFFBQVE7SUFD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SUFDaEQsWUFDRSxJQUFlLEVBQXlDLGFBQW9CO1FBQzFFLEtBQUssQ0FBQyxJQUFJLENBQUMsYUFBYSxFQUFDLG9CQUFvQixFQUFDLGFBQWEsQ0FBQyxDQUFBO1FBRE4sa0JBQWEsR0FBYixhQUFhLENBQU87SUFFNUUsQ0FBQzs7OztJQUNJLFFBQVE7UUFDYixJQUFJLENBQUMsVUFBVSxDQUFDLG9CQUFvQixDQUFDLENBQUE7SUFDdkMsQ0FBQzs7OztJQUNNLGtCQUFrQjtRQUN2QixJQUFJLENBQUMsb0JBQW9CLEVBQUUsQ0FBQTtRQUMzQiwwQkFBMEI7SUFDNUIsQ0FBQzs7O1lBbEJGLFNBQVMsU0FBQztnQkFDVCxRQUFRLEVBQUUsY0FBYztnQkFDeEIsTUFBTSxFQUFFLG9CQUFvQixDQUFDLFVBQVU7Z0JBQ3ZDLE9BQU8sRUFBRSxvQkFBb0IsQ0FBQyxVQUFVO2dCQUN4QyxTQUFTLEVBQUUsQ0FBQyxFQUFDLE9BQU8sRUFBRSxJQUFJLEVBQUUsV0FBVyxFQUFFLFVBQVU7Ozt3QkFBQyxHQUFHLEVBQUUsQ0FBQyx3QkFBd0IsRUFBQyxFQUFDLENBQUM7Z0JBQ3JGLFFBQVEsRUFBRSw2QkFBNkI7YUFDeEM7Ozs7WUFqVEMsVUFBVTtZQUdILElBQUksdUJBaVRTLElBQUksWUFBSSxRQUFRLFlBQUksUUFBUTs7OztJQUE3QixpREFBMkQiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQge1xuICBJbmplY3RhYmxlLFxuICBIb3N0LFxuICBPcHRpb25hbCxcbiAgU2tpcFNlbGYsXG4gIE91dHB1dCxcbiAgT25Jbml0LFxuICBBZnRlckNvbnRlbnRJbml0LFxuICBPbkNoYW5nZXMsXG4gIENvbXBvbmVudCxcbiAgRWxlbWVudFJlZixcbiAgZm9yd2FyZFJlZlxufSBmcm9tICdAYW5ndWxhci9jb3JlJztcbmltcG9ydCB7IGJhc2UgfSBmcm9tICcuL2Jhc2UnO1xuZXhwb3J0IGNsYXNzIG51bWJlcmNvbHVtbk1ldGFEYXRhIHtcbiAgcHVibGljIHN0YXRpYyBYVFlQRTogc3RyaW5nID0gJ251bWJlcmNvbHVtbic7XG4gIHB1YmxpYyBzdGF0aWMgUFJPUEVSVElFUzogc3RyaW5nW10gPSBbXG4gICAgJ2FjdGl2ZUNoaWxkVGFiSW5kZXgnLFxuICAgICdhY3RpdmVJdGVtJyxcbiAgICAnYWxpZ24nLFxuICAgICdhbGxvd0ZvY3VzaW5nRGlzYWJsZWRDaGlsZHJlbicsXG4gICAgJ2Fsd2F5c09uVG9wJyxcbiAgICAnYXJpYUF0dHJpYnV0ZXMnLFxuICAgICdhcmlhRGVzY3JpYmVkQnknLFxuICAgICdhcmlhTGFiZWwnLFxuICAgICdhcmlhTGFiZWxsZWRCeScsXG4gICAgJ2F1dG9EZXN0cm95JyxcbiAgICAnYXV0b1NpemUnLFxuICAgICdheGlzTG9jaycsXG4gICAgJ2JpbmQnLFxuICAgICdib3JkZXInLFxuICAgICdib3R0b20nLFxuICAgICdjYXJkU3dpdGNoQW5pbWF0aW9uJyxcbiAgICAnY2VsbCcsXG4gICAgJ2NlbnRlcmVkJyxcbiAgICAnY2xzJyxcbiAgICAnY29sdW1ucycsXG4gICAgJ2NvbXB1dGVkV2lkdGgnLFxuICAgICdjb25zdHJhaW5BbGlnbicsXG4gICAgJ2NvbnRlbnRFbCcsXG4gICAgJ2NvbnRyb2wnLFxuICAgICdjb250cm9sbGVyJyxcbiAgICAnZGF0YScsXG4gICAgJ2RhdGFJbmRleCcsXG4gICAgJ2RlZmF1bHRDb2x1bW5VSScsXG4gICAgJ2RlZmF1bHRFZGl0b3InLFxuICAgICdkZWZhdWx0Rm9jdXMnLFxuICAgICdkZWZhdWx0TGlzdGVuZXJTY29wZScsXG4gICAgJ2RlZmF1bHRzJyxcbiAgICAnZGVmYXVsdFRvb2xXZWlnaHRzJyxcbiAgICAnZGVmYXVsdFR5cGUnLFxuICAgICdkZWZhdWx0V2lkdGgnLFxuICAgICdkZXBlbmRzJyxcbiAgICAnZGlzYWJsZWQnLFxuICAgICdkaXNwbGF5ZWQnLFxuICAgICdkb2NrZWQnLFxuICAgICdkcmFnZ2FibGUnLFxuICAgICdlZGl0YWJsZScsXG4gICAgJ2VkaXRvcicsXG4gICAgJ2VudGVyQW5pbWF0aW9uJyxcbiAgICAnZXZlbnRIYW5kbGVycycsXG4gICAgJ2V4aXRBbmltYXRpb24nLFxuICAgICdleHBvcnRSZW5kZXJlcicsXG4gICAgJ2V4cG9ydFN0eWxlJyxcbiAgICAnZXhwb3J0U3VtbWFyeVJlbmRlcmVyJyxcbiAgICAnZmlsdGVyJyxcbiAgICAnZmxleCcsXG4gICAgJ2Zsb2F0ZWQnLFxuICAgICdmb2N1c2FibGVDb250YWluZXInLFxuICAgICdmb2N1c0NscycsXG4gICAgJ2Zvcm1hdCcsXG4gICAgJ2Zvcm1hdHRlcicsXG4gICAgJ2Z1bGxzY3JlZW4nLFxuICAgICdncm91cGFibGUnLFxuICAgICdncm91cGVyJyxcbiAgICAnZ3JvdXBIZWFkZXJUcGwnLFxuICAgICdoZWlnaHQnLFxuICAgICdoaWRkZW4nLFxuICAgICdoaWRlYWJsZScsXG4gICAgJ2hpZGVBbmltYXRpb24nLFxuICAgICdoaWRlTW9kZScsXG4gICAgJ2hpZGVPbk1hc2tUYXAnLFxuICAgICdoaWRlU2hvd01lbnVJdGVtJyxcbiAgICAnaHRtbCcsXG4gICAgJ2lkJyxcbiAgICAnaWdub3JlJyxcbiAgICAnaWdub3JlRXhwb3J0JyxcbiAgICAnaW5hY3RpdmVDaGlsZFRhYkluZGV4JyxcbiAgICAnaW5uZXJDbHMnLFxuICAgICdpbnN0YW5jZUNscycsXG4gICAgJ2l0ZW1JZCcsXG4gICAgJ2l0ZW1zJyxcbiAgICAna2V5TWFwJyxcbiAgICAna2V5TWFwRW5hYmxlZCcsXG4gICAgJ2tleU1hcFRhcmdldCcsXG4gICAgJ2xheW91dCcsXG4gICAgJ2xlZnQnLFxuICAgICdsaXN0ZW5lcnMnLFxuICAgICdsb2NrZWQnLFxuICAgICdtYW5hZ2VCb3JkZXJzJyxcbiAgICAnbWFyZ2luJyxcbiAgICAnbWFza2VkJyxcbiAgICAnbWF4SGVpZ2h0JyxcbiAgICAnbWF4V2lkdGgnLFxuICAgICdtZW51JyxcbiAgICAnbWVudURpc2FibGVkJyxcbiAgICAnbWluSGVpZ2h0JyxcbiAgICAnbWluV2lkdGgnLFxuICAgICdtb2RhbCcsXG4gICAgJ21vZGVsVmFsaWRhdGlvbicsXG4gICAgJ25hbWUnLFxuICAgICduYW1lYWJsZScsXG4gICAgJ25hbWVIb2xkZXInLFxuICAgICdwYWRkaW5nJyxcbiAgICAncGx1Z2lucycsXG4gICAgJ3B1Ymxpc2hlcycsXG4gICAgJ3JlY29yZCcsXG4gICAgJ3JlZmVyZW5jZScsXG4gICAgJ3JlZmVyZW5jZUhvbGRlcicsXG4gICAgJ3JlbGF0aXZlJyxcbiAgICAncmVuZGVyZXInLFxuICAgICdyZW5kZXJUbycsXG4gICAgJ3Jlc2VydmVTY3JvbGxiYXInLFxuICAgICdyZXNldEZvY3VzUG9zaXRpb24nLFxuICAgICdyZXNpemFibGUnLFxuICAgICdyaWdodCcsXG4gICAgJ3JpcHBsZScsXG4gICAgJ3Njb3BlJyxcbiAgICAnc2NyYXRjaENlbGwnLFxuICAgICdzY3JvbGxhYmxlJyxcbiAgICAnc2VsZkFsaWduJyxcbiAgICAnc2Vzc2lvbicsXG4gICAgJ3NoYWRvdycsXG4gICAgJ3NoYXJlYWJsZU5hbWUnLFxuICAgICdzaGltJyxcbiAgICAnc2hvd0FuaW1hdGlvbicsXG4gICAgJ3NvcnRhYmxlJyxcbiAgICAnc29ydGVyJyxcbiAgICAnc3RhdGVmdWwnLFxuICAgICdzdGF0ZWZ1bERlZmF1bHRzJyxcbiAgICAnc3RhdGVJZCcsXG4gICAgJ3N0eWxlJyxcbiAgICAnc3VtbWFyeScsXG4gICAgJ3N1bW1hcnlDZWxsJyxcbiAgICAnc3VtbWFyeURhdGFJbmRleCcsXG4gICAgJ3N1bW1hcnlGb3JtYXR0ZXInLFxuICAgICdzdW1tYXJ5UmVuZGVyZXInLFxuICAgICdzdW1tYXJ5VHlwZScsXG4gICAgJ3RhYkluZGV4JyxcbiAgICAndGV4dCcsXG4gICAgJ3RvRnJvbnRPblNob3cnLFxuICAgICd0b29sRGVmYXVsdHMnLFxuICAgICd0b29scycsXG4gICAgJ3Rvb2x0aXAnLFxuICAgICd0b3AnLFxuICAgICd0b3VjaEFjdGlvbicsXG4gICAgJ3RwbCcsXG4gICAgJ3RwbFdyaXRlTW9kZScsXG4gICAgJ3RyYW5zbGF0YWJsZScsXG4gICAgJ3R3b1dheUJpbmRhYmxlJyxcbiAgICAndWknLFxuICAgICd1c2VyQ2xzJyxcbiAgICAndXNlclNlbGVjdGFibGUnLFxuICAgICd2ZXJ0aWNhbE92ZXJmbG93JyxcbiAgICAndmlld01vZGVsJyxcbiAgICAnd2VpZ2h0JyxcbiAgICAnd2VpZ2h0ZWQnLFxuICAgICd3aWR0aCcsXG4gICAgJ3gnLFxuICAgICd4dHlwZScsXG4gICAgJ3knLFxuICAgICd6SW5kZXgnLFxuICAgICdwbGF0Zm9ybUNvbmZpZycsXG4gICAgJ3Jlc3BvbnNpdmVDb25maWcnLFxuICAgICdhbGlnbicsXG4gICAgJ2ZpdFRvUGFyZW50JyxcbiAgICAnY29uZmlnJ1xuXTtcbiAgcHVibGljIHN0YXRpYyBFVkVOVFM6IGFueVtdID0gW1xuXHRcdHtuYW1lOidhY3RpdmF0ZScscGFyYW1ldGVyczonbmV3QWN0aXZlSXRlbSxudW1iZXJjb2x1bW4sb2xkQWN0aXZlSXRlbSd9LFxuXHRcdHtuYW1lOidhY3RpdmVJdGVtY2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUnfSxcblx0XHR7bmFtZTonYWRkJyxwYXJhbWV0ZXJzOidudW1iZXJjb2x1bW4saXRlbSxpbmRleCd9LFxuXHRcdHtuYW1lOidhZGRlZCcscGFyYW1ldGVyczonc2VuZGVyLGNvbnRhaW5lcixpbmRleCd9LFxuXHRcdHtuYW1lOidiZWZvcmVhY3RpdmVJdGVtY2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUsdW5kZWZpbmVkJ30sXG5cdFx0e25hbWU6J2JlZm9yZWJvdHRvbWNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlLHVuZGVmaW5lZCd9LFxuXHRcdHtuYW1lOidiZWZvcmVjZW50ZXJlZGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlLHVuZGVmaW5lZCd9LFxuXHRcdHtuYW1lOidiZWZvcmVkaXNhYmxlZGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlLHVuZGVmaW5lZCd9LFxuXHRcdHtuYW1lOidiZWZvcmVkb2NrZWRjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcix2YWx1ZSxvbGRWYWx1ZSx1bmRlZmluZWQnfSxcblx0XHR7bmFtZTonYmVmb3JlaGVpZ2h0Y2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUsdW5kZWZpbmVkJ30sXG5cdFx0e25hbWU6J2JlZm9yZWhpZGRlbmNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlLHVuZGVmaW5lZCd9LFxuXHRcdHtuYW1lOidiZWZvcmVoaWRlJyxwYXJhbWV0ZXJzOidzZW5kZXInfSxcblx0XHR7bmFtZTonYmVmb3JlbGVmdGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlLHVuZGVmaW5lZCd9LFxuXHRcdHtuYW1lOidiZWZvcmVtYXhIZWlnaHRjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcix2YWx1ZSxvbGRWYWx1ZSx1bmRlZmluZWQnfSxcblx0XHR7bmFtZTonYmVmb3JlbWF4V2lkdGhjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcix2YWx1ZSxvbGRWYWx1ZSx1bmRlZmluZWQnfSxcblx0XHR7bmFtZTonYmVmb3JlbWluSGVpZ2h0Y2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUsdW5kZWZpbmVkJ30sXG5cdFx0e25hbWU6J2JlZm9yZW1pbldpZHRoY2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUsdW5kZWZpbmVkJ30sXG5cdFx0e25hbWU6J2JlZm9yZW9yaWVudGF0aW9uY2hhbmdlJyxwYXJhbWV0ZXJzOicnfSxcblx0XHR7bmFtZTonYmVmb3JlcmlnaHRjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcix2YWx1ZSxvbGRWYWx1ZSx1bmRlZmluZWQnfSxcblx0XHR7bmFtZTonYmVmb3Jlc2Nyb2xsYWJsZWNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlLHVuZGVmaW5lZCd9LFxuXHRcdHtuYW1lOidiZWZvcmVzaG93JyxwYXJhbWV0ZXJzOidzZW5kZXInfSxcblx0XHR7bmFtZTonYmVmb3JldG9mcm9udCcscGFyYW1ldGVyczonbnVtYmVyY29sdW1uJ30sXG5cdFx0e25hbWU6J2JlZm9yZXRvcGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlLHVuZGVmaW5lZCd9LFxuXHRcdHtuYW1lOidiZWZvcmV3aWR0aGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlLHVuZGVmaW5lZCd9LFxuXHRcdHtuYW1lOidibHVyJyxwYXJhbWV0ZXJzOidudW1iZXJjb2x1bW4sZXZlbnQnfSxcblx0XHR7bmFtZTonYm90dG9tY2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUnfSxcblx0XHR7bmFtZTonY2VudGVyZWRjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcix2YWx1ZSxvbGRWYWx1ZSd9LFxuXHRcdHtuYW1lOidkZWFjdGl2YXRlJyxwYXJhbWV0ZXJzOidvbGRBY3RpdmVJdGVtLG51bWJlcmNvbHVtbixuZXdBY3RpdmVJdGVtJ30sXG5cdFx0e25hbWU6J2Rlc3Ryb3knLHBhcmFtZXRlcnM6Jyd9LFxuXHRcdHtuYW1lOidkaXNhYmxlZGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlJ30sXG5cdFx0e25hbWU6J2RvY2tlZGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlJ30sXG5cdFx0e25hbWU6J2VyYXNlZCcscGFyYW1ldGVyczonc2VuZGVyJ30sXG5cdFx0e25hbWU6J2Zsb2F0aW5nY2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIscG9zaXRpb25lZCd9LFxuXHRcdHtuYW1lOidmb2N1cycscGFyYW1ldGVyczonbnVtYmVyY29sdW1uLGV2ZW50J30sXG5cdFx0e25hbWU6J2ZvY3VzZW50ZXInLHBhcmFtZXRlcnM6J251bWJlcmNvbHVtbixldmVudCd9LFxuXHRcdHtuYW1lOidmb2N1c2xlYXZlJyxwYXJhbWV0ZXJzOidudW1iZXJjb2x1bW4sZXZlbnQnfSxcblx0XHR7bmFtZTonZnVsbHNjcmVlbicscGFyYW1ldGVyczonc2VuZGVyJ30sXG5cdFx0e25hbWU6J2hlaWdodGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlJ30sXG5cdFx0e25hbWU6J2hpZGRlbmNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlJ30sXG5cdFx0e25hbWU6J2hpZGUnLHBhcmFtZXRlcnM6J3NlbmRlcid9LFxuXHRcdHtuYW1lOidpbml0aWFsaXplJyxwYXJhbWV0ZXJzOidzZW5kZXInfSxcblx0XHR7bmFtZTonbGVmdGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlJ30sXG5cdFx0e25hbWU6J21heEhlaWdodGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlJ30sXG5cdFx0e25hbWU6J21heFdpZHRoY2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUnfSxcblx0XHR7bmFtZTonbWluSGVpZ2h0Y2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUnfSxcblx0XHR7bmFtZTonbWluV2lkdGhjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcix2YWx1ZSxvbGRWYWx1ZSd9LFxuXHRcdHtuYW1lOidtb3ZlJyxwYXJhbWV0ZXJzOidudW1iZXJjb2x1bW4saXRlbSx0b0luZGV4LGZyb21JbmRleCd9LFxuXHRcdHtuYW1lOidtb3ZlZCcscGFyYW1ldGVyczonc2VuZGVyLGNvbnRhaW5lcix0b0luZGV4LGZyb21JbmRleCd9LFxuXHRcdHtuYW1lOidvcmllbnRhdGlvbmNoYW5nZScscGFyYW1ldGVyczonJ30sXG5cdFx0e25hbWU6J3BhaW50ZWQnLHBhcmFtZXRlcnM6J3NlbmRlcixlbGVtZW50J30sXG5cdFx0e25hbWU6J3Bvc2l0aW9uZWRjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcixwb3NpdGlvbmVkJ30sXG5cdFx0e25hbWU6J3JlbW92ZScscGFyYW1ldGVyczonbnVtYmVyY29sdW1uLGl0ZW0saW5kZXgnfSxcblx0XHR7bmFtZToncmVtb3ZlZCcscGFyYW1ldGVyczonc2VuZGVyLGNvbnRhaW5lcixpbmRleCd9LFxuXHRcdHtuYW1lOidyZW5kZXJlZGNoYW5nZScscGFyYW1ldGVyczonbnVtYmVyY29sdW1uLGl0ZW0scmVuZGVyZWQnfSxcblx0XHR7bmFtZToncmVzaXplJyxwYXJhbWV0ZXJzOidlbGVtZW50LGluZm8nfSxcblx0XHR7bmFtZToncmlnaHRjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcix2YWx1ZSxvbGRWYWx1ZSd9LFxuXHRcdHtuYW1lOidzY3JvbGxhYmxlY2hhbmdlJyxwYXJhbWV0ZXJzOidzZW5kZXIsdmFsdWUsb2xkVmFsdWUnfSxcblx0XHR7bmFtZTonc2hvdycscGFyYW1ldGVyczonc2VuZGVyJ30sXG5cdFx0e25hbWU6J3RvZnJvbnQnLHBhcmFtZXRlcnM6J251bWJlcmNvbHVtbid9LFxuXHRcdHtuYW1lOid0b3BjaGFuZ2UnLHBhcmFtZXRlcnM6J3NlbmRlcix2YWx1ZSxvbGRWYWx1ZSd9LFxuXHRcdHtuYW1lOid1cGRhdGVkYXRhJyxwYXJhbWV0ZXJzOidzZW5kZXIsbmV3RGF0YSd9LFxuXHRcdHtuYW1lOid3aWR0aGNoYW5nZScscGFyYW1ldGVyczonc2VuZGVyLHZhbHVlLG9sZFZhbHVlJ30sXG5cdFx0e25hbWU6J3JlYWR5JyxwYXJhbWV0ZXJzOicnfVxuXTtcbiAgcHVibGljIHN0YXRpYyBFVkVOVE5BTUVTOiBzdHJpbmdbXSA9IFtcblx0XHQnYWN0aXZhdGUnLFxuXHRcdCdhY3RpdmVJdGVtY2hhbmdlJyxcblx0XHQnYWRkJyxcblx0XHQnYWRkZWQnLFxuXHRcdCdiZWZvcmVhY3RpdmVJdGVtY2hhbmdlJyxcblx0XHQnYmVmb3JlYm90dG9tY2hhbmdlJyxcblx0XHQnYmVmb3JlY2VudGVyZWRjaGFuZ2UnLFxuXHRcdCdiZWZvcmVkaXNhYmxlZGNoYW5nZScsXG5cdFx0J2JlZm9yZWRvY2tlZGNoYW5nZScsXG5cdFx0J2JlZm9yZWhlaWdodGNoYW5nZScsXG5cdFx0J2JlZm9yZWhpZGRlbmNoYW5nZScsXG5cdFx0J2JlZm9yZWhpZGUnLFxuXHRcdCdiZWZvcmVsZWZ0Y2hhbmdlJyxcblx0XHQnYmVmb3JlbWF4SGVpZ2h0Y2hhbmdlJyxcblx0XHQnYmVmb3JlbWF4V2lkdGhjaGFuZ2UnLFxuXHRcdCdiZWZvcmVtaW5IZWlnaHRjaGFuZ2UnLFxuXHRcdCdiZWZvcmVtaW5XaWR0aGNoYW5nZScsXG5cdFx0J2JlZm9yZW9yaWVudGF0aW9uY2hhbmdlJyxcblx0XHQnYmVmb3JlcmlnaHRjaGFuZ2UnLFxuXHRcdCdiZWZvcmVzY3JvbGxhYmxlY2hhbmdlJyxcblx0XHQnYmVmb3Jlc2hvdycsXG5cdFx0J2JlZm9yZXRvZnJvbnQnLFxuXHRcdCdiZWZvcmV0b3BjaGFuZ2UnLFxuXHRcdCdiZWZvcmV3aWR0aGNoYW5nZScsXG5cdFx0J2JsdXInLFxuXHRcdCdib3R0b21jaGFuZ2UnLFxuXHRcdCdjZW50ZXJlZGNoYW5nZScsXG5cdFx0J2RlYWN0aXZhdGUnLFxuXHRcdCdkZXN0cm95Jyxcblx0XHQnZGlzYWJsZWRjaGFuZ2UnLFxuXHRcdCdkb2NrZWRjaGFuZ2UnLFxuXHRcdCdlcmFzZWQnLFxuXHRcdCdmbG9hdGluZ2NoYW5nZScsXG5cdFx0J2ZvY3VzJyxcblx0XHQnZm9jdXNlbnRlcicsXG5cdFx0J2ZvY3VzbGVhdmUnLFxuXHRcdCdmdWxsc2NyZWVuJyxcblx0XHQnaGVpZ2h0Y2hhbmdlJyxcblx0XHQnaGlkZGVuY2hhbmdlJyxcblx0XHQnaGlkZScsXG5cdFx0J2luaXRpYWxpemUnLFxuXHRcdCdsZWZ0Y2hhbmdlJyxcblx0XHQnbWF4SGVpZ2h0Y2hhbmdlJyxcblx0XHQnbWF4V2lkdGhjaGFuZ2UnLFxuXHRcdCdtaW5IZWlnaHRjaGFuZ2UnLFxuXHRcdCdtaW5XaWR0aGNoYW5nZScsXG5cdFx0J21vdmUnLFxuXHRcdCdtb3ZlZCcsXG5cdFx0J29yaWVudGF0aW9uY2hhbmdlJyxcblx0XHQncGFpbnRlZCcsXG5cdFx0J3Bvc2l0aW9uZWRjaGFuZ2UnLFxuXHRcdCdyZW1vdmUnLFxuXHRcdCdyZW1vdmVkJyxcblx0XHQncmVuZGVyZWRjaGFuZ2UnLFxuXHRcdCdyZXNpemUnLFxuXHRcdCdyaWdodGNoYW5nZScsXG5cdFx0J3Njcm9sbGFibGVjaGFuZ2UnLFxuXHRcdCdzaG93Jyxcblx0XHQndG9mcm9udCcsXG5cdFx0J3RvcGNoYW5nZScsXG5cdFx0J3VwZGF0ZWRhdGEnLFxuXHRcdCd3aWR0aGNoYW5nZScsXG5cdFx0J3JlYWR5J1xuXTtcbn1cbkBDb21wb25lbnQoe1xuICBzZWxlY3RvcjogJ251bWJlcmNvbHVtbicsIFxuICBpbnB1dHM6IG51bWJlcmNvbHVtbk1ldGFEYXRhLlBST1BFUlRJRVMsXG4gIG91dHB1dHM6IG51bWJlcmNvbHVtbk1ldGFEYXRhLkVWRU5UTkFNRVMsXG4gIHByb3ZpZGVyczogW3twcm92aWRlOiBiYXNlLCB1c2VFeGlzdGluZzogZm9yd2FyZFJlZigoKSA9PiBFeHROdW1iZXJjb2x1bW5Db21wb25lbnQpfV0sXG4gIHRlbXBsYXRlOiAnPG5nLXRlbXBsYXRlPjwvbmctdGVtcGxhdGU+J1xufSlcbmV4cG9ydCBjbGFzcyBFeHROdW1iZXJjb2x1bW5Db21wb25lbnQgZXh0ZW5kcyBiYXNlIGltcGxlbWVudHMgT25Jbml0LEFmdGVyQ29udGVudEluaXQsT25DaGFuZ2VzIHtcbiAgY29uc3RydWN0b3IoXG4gICAgZVJlZjpFbGVtZW50UmVmLCBASG9zdCgpIEBPcHRpb25hbCgpIEBTa2lwU2VsZigpIHB1YmxpYyBob3N0Q29tcG9uZW50IDogYmFzZSkge1xuICAgICAgc3VwZXIoZVJlZi5uYXRpdmVFbGVtZW50LG51bWJlcmNvbHVtbk1ldGFEYXRhLGhvc3RDb21wb25lbnQpXG4gICAgfVxuICBwdWJsaWMgbmdPbkluaXQoKSB7XG4gICAgdGhpcy5iYXNlT25Jbml0KG51bWJlcmNvbHVtbk1ldGFEYXRhKVxuICB9XG4gIHB1YmxpYyBuZ0FmdGVyQ29udGVudEluaXQoKSB7XG4gICAgdGhpcy5iYXNlQWZ0ZXJDb250ZW50SW5pdCgpXG4gICAgLy90aGlzWydyZWFkeSddLmVtaXQodGhpcylcbiAgfVxuICAvL3B1YmxpYyBuZ09uQ2hhbmdlcyhjaGFuZ2VzOiBTaW1wbGVDaGFuZ2VzKSB7dGhpcy5iYXNlT25DaGFuZ2VzKGNoYW5nZXMpfVxuXG59Il19