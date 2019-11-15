Ext.define('Ext.drag.Manager', {
    singleton: true,
    dragCls: Ext.baseCSSPrefix + 'drag-body',
    pointerBug: Ext.isTouch || (!Ext.supports.CSSPointerEvents || Ext.isIE10m || Ext.isOpera),
    constructor: function() {
        this.targets = {};
        this.nativeTargets = [];
        Ext.onReady(this.init, this);
    },
    init: function() {
        Ext.getDoc().on({
            scope: this,
            dragenter: {
                capture: true,
                fn: 'onNativeDragEnter'
            },
            dragleave: 'onNativeDragLeave',
            dragover: 'onNativeDragOver',
            drop: 'onNativeDrop'
        });
    },
    destroy: function() {
        var me = this,
            targets = me.targets,
            key;
        me.destroying = true;
        for (key in targets) {
            targets[key].destroy();
        }
        me.targets = null;
        me.callParent();
    },
    privates: {
        elementFromPoint: function(x, y) {
            if (Ext.rootInheritedState.rtl) {
                x = Ext.Element.getViewportWidth() - x;
            }
            return Ext.dom.Element.fromPagePoint(x, y, true);
        },
        getAtPoint: function(info) {
            var current = info.cursor.current,
                elementMap = info.elementMap,
                isUnderCursor = info.proxy.isUnderCursor,
                proxyEl = this.pointerBug && isUnderCursor ? info.proxy.element.dom : null,
                target, el;
            if (proxyEl) {
                proxyEl.style.visibility = 'hidden';
            }
            el = this.elementFromPoint(current.x, current.y);
            if (proxyEl) {
                proxyEl.style.visibility = 'visible';
            }
            while (el) {
                target = elementMap[el.id];
                if (target) {
                    return target;
                }
                el = el.parentNode;
            }
            return null;
        },
        getNativeDragInfo: function(e) {
            var info = this.nativeDragInfo;
            if (!info) {
                this.nativeDragInfo = info = new Ext.drag.Info();
                info.isNative = true;
            }
            return info;
        },
        onDragCancel: function() {
            Ext.getBody().removeCls(this.dragCls);
        },
        onDragEnd: function(info, e) {
            info.finalize();
            Ext.getBody().removeCls(this.dragCls);
        },
        onDragMove: function(info, e) {
            this.processDrag(info);
        },
        onDragStart: function(info, e) {
            var me = this,
                source = info.source,
                targets = me.targets,
                groups = source.getGroups(),
                targetMap = {},
                possibleTargets = {},
                elementMap = {},
                id, target, targetGroups, groupMap, groupOk, len, i;
            elementMap = {};
            possibleTargets = {};
            if (groups) {
                groupMap = Ext.Array.toMap(groups);
            }
            for (id in targets) {
                target = targets[id];
                if (!target.isDisabled()) {
                    groupOk = false;
                    targetGroups = target.getGroups();
                    if (!groupMap && !targetGroups) {
                        groupOk = true;
                    } else if (groupMap && targetGroups) {
                        for (i = 0 , len = targetGroups.length; i < len; ++i) {
                            if (groupMap[targetGroups[i]]) {
                                groupOk = true;
                                break;
                            }
                        }
                    }
                    if (groupOk) {
                        possibleTargets[id] = target;
                    }
                }
                targetMap[id] = target;
                elementMap[target.getElement().id] = target;
            }
            info.possibleTargets = possibleTargets;
            info.targetMap = targetMap;
            info.elementMap = elementMap;
            Ext.getBody().addCls(me.dragCls);
            me.processDrag(info);
        },
        onNativeDragEnter: function(e) {
            var nativeTargets = this.nativeTargets,
                target = e.target;
            e.preventDefault();
            if (nativeTargets[nativeTargets.length - 1] !== target) {
                nativeTargets.push(target);
            }
        },
        onNativeDragLeave: function(e) {
            var nativeTargets = this.nativeTargets;
            Ext.Array.remove(nativeTargets, e.target);
            if (nativeTargets.length === 0) {
                this.nativeDragInfo = null;
            }
        },
        onNativeDragOver: function(e) {
            e.preventDefault();
        },
        onNativeDrop: function(e) {
            e.preventDefault();
            this.nativeTargets.length = 0;
            this.nativeDragInfo = null;
        },
        processDrag: function(info) {
            info.setActive(this.getAtPoint(info));
        },
        register: function(target) {
            this.targets[target.getId()] = target;
        },
        unregister: function(target) {
            var id;
            if (this.destroying) {
                return;
            }
            id = target.getId();
            this.targets[id] = null;
            delete this.targets[id];
        }
    }
});

Ext.define('Ext.drag.Target', {
    extend: Ext.drag.Item,
    defaultIdPrefix: 'target-',
    config: {
        invalidCls: '',
        validCls: ''
    },
    constructor: function(config) {
        var me = this,
            accepts = config && config.accepts;
        if (accepts) {
            me.accepts = accepts;
            config = Ext.apply({}, config);
            delete config.accepts;
        }
        me.callParent([
            config
        ]);
        Ext.drag.Manager.register(me);
    },
    accepts: function(info) {
        return true;
    },
    disable: function() {
        this.callParent();
        this.setupListeners(null);
    },
    enable: function() {
        this.callParent();
        this.setupListeners();
    },
    beforeDrop: Ext.emptyFn,
    onDrop: Ext.emptyFn,
    onDragEnter: Ext.emptyFn,
    onDragLeave: Ext.emptyFn,
    onDragMove: Ext.emptyFn,
    updateInvalidCls: function(invalidCls, oldInvalidCls) {
        var info = this.info;
        this.doUpdateCls(info && !info.valid, invalidCls, oldInvalidCls);
    },
    updateValidCls: function(validCls, oldValidCls) {
        var info = this.info;
        this.doUpdateCls(info && info.valid, validCls, oldValidCls);
    },
    destroy: function() {
        Ext.drag.Manager.unregister(this);
        this.callParent();
    },
    privates: {
        doUpdateCls: function(needsAdd, cls, oldCls) {
            var el = this.getElement();
            if (oldCls) {
                el.removeCls(oldCls);
            }
            if (cls && needsAdd) {
                el.addCls(cls);
            }
        },
        getElListeners: function() {
            return {
                dragenter: 'handleNativeDragEnter',
                dragleave: 'handleNativeDragLeave',
                dragover: 'handleNativeDragMove',
                drop: 'handleNativeDrop'
            };
        },
        handleDrop: function(info) {
            var me = this,
                hasListeners = me.hasListeners,
                valid = info.valid;
            me.getElement().removeCls([
                me.getInvalidCls(),
                me.getValidCls()
            ]);
            if (valid && me.beforeDrop(info) !== false) {
                if (hasListeners.beforedrop && me.fireEvent('beforedrop', me, info) === false) {
                    return false;
                }
                me.onDrop(info);
                if (hasListeners.drop) {
                    me.fireEvent('drop', me, info);
                }
            } else {
                return false;
            }
        },
        handleDragEnter: function(info) {
            var me = this,
                cls = info.valid ? me.getValidCls() : me.getInvalidCls();
            if (cls) {
                me.getElement().addCls(cls);
            }
            me.onDragEnter(info);
            if (me.hasListeners.dragenter) {
                me.fireEvent('dragenter', me, info);
            }
        },
        handleDragLeave: function(info) {
            var me = this;
            me.getElement().removeCls([
                me.getInvalidCls(),
                me.getValidCls()
            ]);
            me.onDragLeave(info);
            if (me.hasListeners.dragleave) {
                me.fireEvent('dragleave', me, info);
            }
        },
        handleDragMove: function(info) {
            var me = this;
            me.onDragMove(info);
            if (me.hasListeners.dragmove) {
                me.fireEvent('dragmove', me, info);
            }
        },
        handleNativeDragEnter: function(e) {
            var me = this,
                info = Ext.drag.Manager.getNativeDragInfo(e);
            info.onNativeDragEnter(me, e);
            if (me.hasListeners.dragenter) {
                me.fireEvent('dragenter', me, info);
            }
        },
        handleNativeDragLeave: function(e) {
            var me = this,
                info = Ext.drag.Manager.getNativeDragInfo(e);
            info.onNativeDragLeave(me, e);
            if (me.hasListeners.dragleave) {
                me.fireEvent('dragleave', me, info);
            }
        },
        handleNativeDragMove: function(e) {
            var me = this,
                info = Ext.drag.Manager.getNativeDragInfo(e);
            info.onNativeDragMove(me, e);
            if (me.hasListeners.dragmove) {
                me.fireEvent('dragmove', me, info);
            }
        },
        handleNativeDrop: function(e) {
            var me = this,
                hasListeners = me.hasListeners,
                info = Ext.drag.Manager.getNativeDragInfo(e),
                valid = info.valid;
            info.onNativeDrop(me, e);
            if (valid) {
                if (hasListeners.beforedrop && me.fireEvent('beforedrop', me, info) === false) {
                    return;
                }
                if (hasListeners.drop) {
                    me.fireEvent('drop', me, info);
                }
            }
        }
    }
});

Ext.define('Ext.drag.proxy.None', {
    mixins: [
        Ext.mixin.Factoryable
    ],
    alias: 'drag.proxy.none',
    factoryConfig: {
        aliasPrefix: 'drag.proxy.',
        type: 'dragproxy'
    },
    config: {
        source: null
    },
    constructor: function(config) {
        var getElement = config && config.getElement;
        if (getElement) {
            this.getElement = getElement;
            config = Ext.apply({}, config);
            delete config.getElement;
        }
        this.initConfig(config);
    },
    cleanup: Ext.emptyFn,
    dragRevert: function(info, revertCls, options, callback) {
        var positionable = this.getPositionable(info),
            initial = info.proxy.initial;
        positionable.addCls(revertCls);
        positionable.setXY([
            initial.x,
            initial.y
        ], Ext.apply({
            callback: function() {
                positionable.removeCls(revertCls);
                callback();
            }
        }, options));
    },
    getElement: function() {
        return null;
    },
    getPositionable: function() {
        return this.element;
    },
    setXY: function(info, xy, animation) {
        var positionable = this.getPositionable(info);
        if (positionable) {
            positionable.setXY(xy, animation);
        }
    },
    update: Ext.emptyFn,
    privates: {
        setupElement: function(info) {
            return (this.element = this.getElement(info));
        },
        adjustCursorOffset: function(info, pos) {
            return pos;
        }
    }
});

Ext.define('Ext.drag.proxy.Original', {
    extend: Ext.drag.proxy.None,
    alias: 'drag.proxy.original',
    getElement: function(info) {
        return info.source.getElement();
    },
    getPositionable: function(info) {
        var source = info.source;
        return source.getComponent() || source.getElement();
    }
});

Ext.define('Ext.drag.proxy.Placeholder', {
    extend: Ext.drag.proxy.None,
    alias: 'drag.proxy.placeholder',
    config: {
        cls: '',
        cursorOffset: [
            12,
            20
        ],
        html: null,
        invalidCls: '',
        validCls: ''
    },
    placeholderCls: Ext.baseCSSPrefix + 'drag-proxy-placeholder',
    cleanup: function() {
        this.element = Ext.destroy(this.element);
    },
    getElement: function() {
        var el = Ext.getBody().createChild({
                cls: this.getCls(),
                html: this.getHtml()
            });
        el.addCls(this.placeholderCls);
        el.setTouchAction({
            panX: false,
            panY: false
        });
        return el;
    },
    update: function(info) {
        var el = this.element,
            invalidCls = this.getInvalidCls(),
            validCls = this.getValidCls(),
            valid = info.valid;
        if (info.target) {
            el.replaceCls(valid ? invalidCls : validCls, valid ? validCls : invalidCls);
        } else {
            el.removeCls([
                invalidCls,
                validCls
            ]);
        }
    },
    updateCls: function(cls, oldCls) {
        var el = this.element;
        if (el) {
            if (oldCls) {
                el.removeCls(oldCls);
            }
            if (cls) {
                el.addCls(cls);
            }
        }
    },
    updateHtml: function(html) {
        var el = this.element;
        if (el) {
            el.setHtml(html || '');
        }
    },
    updateInvalidCls: function(invalidCls, oldInvalidCls) {
        this.doUpdateCls(invalidCls, oldInvalidCls);
    },
    updateValidCls: function(validCls, oldValidCls) {
        this.doUpdateCls(validCls, oldValidCls);
    },
    destroy: function() {
        this.element = Ext.destroy(this.element);
        this.callParent();
    },
    privates: {
        adjustCursorOffset: function(info, xy) {
            var offset = this.getCursorOffset();
            if (offset) {
                xy[0] += (offset[0] || 0);
                xy[1] += (offset[1] || 0);
            }
            return xy;
        },
        doUpdateCls: function(cls, oldCls) {
            var el = this.element,
                hasCls;
            if (el) {
                if (oldCls) {
                    hasCls = cls && el.hasCls(oldCls);
                    el.removeCls(oldCls);
                }
                if (cls && hasCls) {
                    el.addCls(cls);
                }
            }
        }
    }
});

Ext.define('Ext.overrides.drag.proxy.Placeholder', {
    override: 'Ext.drag.proxy.Placeholder',
    getElement: function() {
        var el = this.callParent();
        el.addCls(Ext.baseCSSPrefix + 'root');
        return el;
    }
});

Ext.define('Ext.mixin.ItemRippler', {
    mixinId: 'itemrippler',
    config: {
        itemRipple: null
    },
    shouldRippleItem: function(item, e) {
        var itemRipple, ripple;
        if (e.getTarget(this.noItemRippleSelector, this.element)) {
            return false;
        }
        itemRipple = item && this.getItemRipple();
        if (itemRipple && item.isWidget) {
            ripple = item.shouldRipple(e);
            if (ripple) {
                itemRipple = Ext.apply({}, itemRipple, ripple);
            }
        }
        return itemRipple;
    },
    rippleItem: function(item, e) {
        if (!item) {
            return;
        }
        var me = this,
            start = e.type.match(me.rippleStateRe),
            itemRipple = me.shouldRippleItem(item, e),
            release = itemRipple && itemRipple.release,
            isRelease = release === true,
            el = item.isWidget ? item.el : item,
            pos, delta, rs, rippledItems;
        if (itemRipple && start && isRelease) {
            me.$rippleStart = e.getXY();
        }
        if (itemRipple && el && ((!start && isRelease) || (start && release !== true))) {
            rippledItems = me.$rippledItems || (me.$rippledItems = []);
            rs = me.$rippleStart;
            if (rs) {
                pos = e.getXY();
                delta = Math.sqrt(Math.pow((pos[0] - rs[0]), 2) + Math.pow((pos[1] - rs[1]), 2));
                if (delta <= 8) {
                    el.ripple(e, itemRipple);
                    rippledItems.push(el);
                }
            } else {
                el.ripple(e, itemRipple);
                rippledItems.push(el);
            }
            me.$rippleStart = null;
        }
    },
    destroyAllRipples: function() {
        var items;
        for (items = this.$rippledItems; items && items.length; ) {
            items.pop().destroyAllRipples();
        }
    },
    privates: {
        noItemRippleSelector: '.' + Ext.baseCSSPrefix + 'item-no-ripple, ' + '.' + Ext.baseCSSPrefix + 'item-no-tap',
        rippleStateRe: /start|down/
    }
});

Ext.define('Ext.mixin.ConfigProxy', function(ConfigProxy) {
    return {
        extend: Ext.Mixin,
        mixinConfig: {
            id: 'configproxy',
            extended: function(baseClass, derivedClass, classBody) {
                var proxyConfig = classBody.proxyConfig;
                derivedClass.$configProxies = Ext.apply({}, derivedClass.superclass.self.$configProxies);
                if (proxyConfig) {
                    delete classBody.proxyConfig;
                    ConfigProxy.processClass(derivedClass, proxyConfig);
                }
            }
        },
        onClassMixedIn: function(targetClass) {
            var prototype = targetClass.prototype,
                proxyConfig = prototype.proxyConfig,
                initConfig = prototype.initConfig;
            prototype.$proxiedConfigs = null;
            targetClass.$configProxies = {};
            prototype.initConfig = function(config) {
                initConfig.apply(this, arguments);
                this.$proxiedConfigs = null;
                return this;
            };
            if (proxyConfig) {
                delete prototype.proxyConfig;
                ConfigProxy.processClass(targetClass, proxyConfig);
            }
        },
        getProxiedConfigs: function(name) {
            var me = this,
                configs = me.config,
                configProxies = me.self.$configProxies[name],
                i = configProxies && configProxies.length,
                cfg, proxiedConfigs, ret, s, v;
            if (i && me.isConfiguring) {
                proxiedConfigs = me.$proxiedConfigs || (me.$proxiedConfigs = {});
                while (i-- > 0) {
                    cfg = configProxies[i];
                    proxiedConfigs[s = cfg.name] = cfg;
                    if ((v = configs[s]) !== undefined) {
                        (ret || (ret = {}))[s] = v;
                    }
                }
            }
            return ret;
        },
        mergeProxiedConfigs: function(name, itemConfig, alwaysClone) {
            var me = this,
                ret = itemConfig,
                proxied = me.getProxiedConfigs(name),
                configurator;
            if (proxied) {
                if (!itemConfig) {
                    ret = proxied;
                } else if (itemConfig.constructor === Object) {
                    configurator = me.self.getConfigurator();
                    ret = configurator.merge(me, Ext.clone(itemConfig), proxied);
                }
            }
            if (alwaysClone && ret === itemConfig) {
                ret = Ext.clone(ret);
            }
            return ret;
        },
        statics: {
            processClass: function(targetClass, proxyConfig) {
                var ExtConfig = Ext.Config,
                    targetProto = targetClass.prototype,
                    add = {},
                    proxies = targetClass.$configProxies,
                    cfg, configs, itemGetter, i, item, methods, n, name, proxiedConfigs, s;
                for (item in proxyConfig) {
                    itemGetter = ExtConfig.get(item).names.get;
                    configs = proxyConfig[item];
                    if (Ext.isArray(configs)) {
                        methods = null;
                    } else {
                        methods = configs.methods;
                        configs = configs.configs;
                    }
                    if (!(proxiedConfigs = proxies[item])) {
                        proxies[item] = proxiedConfigs = [];
                    } else {
                        proxies[item] = proxiedConfigs = proxiedConfigs.slice();
                    }
                    for (i = 0 , n = methods && methods.length; i < n; ++i) {
                        if (!targetProto[name = methods[i]]) {
                            targetProto[name] = ConfigProxy.wrapFn(itemGetter, name);
                        } else {
                            Ext.raise('Cannot proxy method "' + name + '"');
                        }
                    }
                    for (i = 0 , n = configs && configs.length; i < n; ++i) {
                        cfg = ExtConfig.get(s = configs[i]);
                        if (s in add) {
                            Ext.raise('Duplicate proxy config definitions for "' + s + '"');
                        }
                        if (s in targetProto.config) {
                            Ext.raise('Config "' + s + '" already defined for class ' + targetProto.$className);
                        }
                        add[s] = undefined;
                        proxiedConfigs.push(cfg);
                        if (!targetProto[name = cfg.names.get]) {
                            targetProto[name] = ConfigProxy.wrapGet(itemGetter, name);
                        } else {
                            Ext.raise('Cannot proxy "' + s + '" config getter');
                        }
                        if (!targetProto[name = cfg.names.set]) {
                            targetProto[name] = ConfigProxy.wrapSet(itemGetter, name, s);
                        } else {
                            Ext.raise('Cannot proxy "' + s + '" config setter');
                        }
                    }
                }
                targetClass.addConfig(add);
            },
            wrapFn: function(itemGetter, name) {
                return function() {
                    var item = this[itemGetter]();
                    return item && item[name].apply(item, arguments);
                };
            },
            wrapGet: function(itemGetter, configGetter) {
                return function() {
                    var item = this[itemGetter]();
                    return item && item[configGetter]();
                };
            },
            wrapSet: function(itemGetter, configSetter, itemName) {
                return function(value) {
                    var me = this,
                        item, proxiedConfigs;
                    if (!me.isConfiguring || value !== undefined) {
                        item = me[itemGetter]();
                        proxiedConfigs = me.$proxiedConfigs;
                        if (proxiedConfigs && proxiedConfigs[itemName]) {
                            delete proxiedConfigs[itemName];
                            item = null;
                        }
                        if (item) {
                            item[configSetter](value);
                        }
                    }
                    return me;
                };
            }
        }
    };
});

Ext.define('Ext.mixin.StoreWatcher', {
    mixinId: 'storewatcher',
    config: {
        dataSource: null,
        owner: null,
        ownerListeners: {
            destroyable: true,
            storechange: 'onOwnerStoreChange'
        },
        sourceListeners: null,
        store: null,
        storeListeners: null
    },
    afterClassMixedIn: function(targetClass) {
        var configurator = this.getConfigurator(),
            prototype = targetClass.prototype,
            config = {},
            prop;
        for (prop in configurator.configs) {
            if (prototype.hasOwnProperty(prop)) {
                config[prop] = prototype[prop];
                delete prototype[prop];
            }
        }
        targetClass.addConfig(config);
    },
    onOwnerStoreChange: function(comp, store) {
        this.setStore(store);
    },
    updateDataSource: function(source) {
        this.syncListeners(source, '$sourceListeners', 'getSourceListeners');
    },
    updateOwner: function(owner) {
        var me = this,
            ownerProperty = me.ownerProperty;
        if (ownerProperty) {
            me[ownerProperty] = owner;
        }
        me.syncListeners(owner, '$ownerListeners', 'getOwnerListeners');
        me.setStore(owner ? owner.getStore() : null);
    },
    applyStore: function(store) {
        return (store && !store.isEmptyStore) ? store : null;
    },
    updateStore: function(store) {
        this.syncListeners(store, '$storeListeners', 'getStoreListeners');
        this.syncDataSource();
    },
    privates: {
        syncDataSource: function() {
            var store = this.getStore(),
                source;
            if (!store) {
                source = null;
            } else if (store.getDataSource) {
                source = store.getDataSource();
            } else {
                source = store.getData();
            }
            this.setDataSource(source);
        },
        syncListeners: function(instance, token, listeners) {
            var me = this,
                old = me[token];
            if (old) {
                me[token] = null;
                old.destroy();
            }
            if (instance) {
                listeners = me[listeners]();
                listeners = Ext.applyIf({
                    destroyable: true,
                    scope: me
                }, listeners);
                me[token] = instance.on(listeners);
            }
        }
    }
});

Ext.define('Ext.mixin.StyleCacher', {
    extend: Ext.Mixin,
    mixinConfig: {
        id: 'stylecacher'
    },
    getCachedStyle: function(el, style) {
        var cache = this.$styleCache;
        if (!cache) {
            cache = this.$styleCache = {};
        }
        if (!(style in cache)) {
            cache[style] = Ext.fly(el).getStyle(style);
        }
        return cache[style];
    }
});

Ext.define('Ext.plugin.AbstractClipboard', {
    extend: Ext.plugin.Abstract,
    cachedConfig: {
        formats: {
            text: {
                get: 'getTextData',
                put: 'putTextData'
            }
        }
    },
    config: {
        memory: null,
        source: 'system',
        system: 'text',
        gridListeners: null
    },
    destroy: function() {
        var me = this,
            keyMap = me.keyMap,
            shared = me.shared;
        Ext.destroy(me.destroyListener);
        if (keyMap) {
            me.keyMap = Ext.destroy(keyMap);
            if (!--shared.counter) {
                shared.textArea = Ext.destroy(shared.textArea);
            }
        } else {
            me.renderListener = Ext.destroy(me.renderListener);
        }
        me.callParent();
    },
    init: function(comp) {
        var me = this,
            listeners = me.getGridListeners();
        if (comp.rendered) {
            me.finishInit(comp);
        } else if (listeners) {
            me.renderListener = comp.on(Ext.apply({
                scope: me,
                destroyable: true,
                single: true
            }, listeners));
        }
    },
    onCmpReady: function() {
        this.renderListener = null;
        this.finishInit(this.getCmp());
    },
    getTarget: function(comp) {
        return comp.el;
    },
    privates: {
        shared: {
            counter: 0,
            data: null,
            textArea: null
        },
        applyMemory: function(value) {
            value = this.applySource(value);
            if (value) {
                for (var i = value.length; i-- > 0; ) {
                    if (value[i] === 'system') {
                        Ext.raise('Invalid clipboard format "' + value[i] + '"');
                    }
                }
            }
            return value;
        },
        applySource: function(value) {
            if (value) {
                if (Ext.isString(value)) {
                    value = [
                        value
                    ];
                } else if (value.length === 0) {
                    value = null;
                }
            }
            if (value) {
                var formats = this.getFormats(),
                    i;
                for (i = value.length; i-- > 0; ) {
                    if (value[i] !== 'system' && !formats[value[i]]) {
                        Ext.raise('Invalid clipboard format "' + value[i] + '"');
                    }
                }
            }
            return value || null;
        },
        applySystem: function(value) {
            var formats = this.getFormats();
            if (!formats[value]) {
                Ext.raise('Invalid clipboard format "' + value + '"');
            }
            return value;
        },
        doCutCopy: function(event, erase) {
            var me = this,
                formats = me.allFormats || me.syncFormats(),
                data = me.getData(erase, formats),
                memory = me.getMemory(),
                system = me.getSystem(),
                sys;
            if (me.validateAction(event) === false) {
                return;
            }
            me.shared.data = memory && data;
            if (system) {
                sys = data[system];
                if (formats[system] < 3) {
                    delete data[system];
                }
                me.setClipboardData(sys);
            }
        },
        doPaste: function(format, data) {
            var formats = this.getFormats();
            this[formats[format].put](data, format);
        },
        finishInit: function(comp) {
            var me = this;
            me.keyMap = new Ext.util.KeyMap({
                target: me.getTarget(comp),
                ignoreInputFields: true,
                binding: [
                    {
                        ctrl: true,
                        key: 'x',
                        fn: me.onCut,
                        scope: me
                    },
                    {
                        ctrl: true,
                        key: 'c',
                        fn: me.onCopy,
                        scope: me
                    },
                    {
                        ctrl: true,
                        key: 'v',
                        fn: me.onPaste,
                        scope: me
                    }
                ]
            });
            ++me.shared.counter;
            me.destroyListener = comp.on({
                destroyable: true,
                destroy: 'destroy',
                scope: me
            });
        },
        getData: function(erase, format) {
            var me = this,
                formats = me.getFormats(),
                data, i, name, names;
            if (Ext.isString(format)) {
                if (!formats[format]) {
                    Ext.raise('Invalid clipboard format "' + format + '"');
                }
                data = me[formats[format].get](format, erase);
            } else {
                data = {};
                names = [];
                if (format) {
                    for (name in format) {
                        if (!formats[name]) {
                            Ext.raise('Invalid clipboard format "' + name + '"');
                        }
                        names.push(name);
                    }
                } else {
                    names = Ext.Object.getAllKeys(formats);
                }
                for (i = names.length; i-- > 0; ) {
                    data[name] = me[formats[name].get](name, erase && !i);
                }
            }
            return data;
        },
        getHiddenTextArea: function() {
            var shared = this.shared,
                el;
            el = shared.textArea;
            if (!el) {
                el = shared.textArea = Ext.getBody().createChild({
                    tag: 'textarea',
                    tabIndex: -1,
                    style: {
                        position: 'absolute',
                        top: '-1000px',
                        width: '1px',
                        height: '1px'
                    }
                });
                el.suspendFocusEvents();
            }
            return el;
        },
        onCopy: function(keyCode, event) {
            this.doCutCopy(event, false);
        },
        onCut: function(keyCode, event) {
            this.doCutCopy(event, true);
        },
        onPaste: function(keyCode, event) {
            var me = this,
                sharedData = me.shared.data,
                source = me.getSource(),
                i, n, s;
            if (me.validateAction(event) === false) {
                return;
            }
            if (source) {
                for (i = 0 , n = source.length; i < n; ++i) {
                    s = source[i];
                    if (s === 'system') {
                        s = me.getSystem();
                        me.pasteClipboardData(s);
                        break;
                    } else if (sharedData && (s in sharedData)) {
                        me.doPaste(s, sharedData[s]);
                        break;
                    }
                }
            }
        },
        pasteClipboardData: function(format) {
            var me = this,
                clippy = window.clipboardData,
                area, focusEl;
            if (clippy && clippy.getData) {
                me.doPaste(format, clippy.getData("text"));
            } else {
                focusEl = Ext.Element.getActiveElement(true);
                area = me.getHiddenTextArea().dom;
                area.value = '';
                if (focusEl) {
                    focusEl.suspendFocusEvents();
                }
                area.focus();
                Ext.defer(function() {
                    if (focusEl) {
                        focusEl.focus();
                        focusEl.resumeFocusEvents();
                    }
                    me.doPaste(format, area.value);
                    area.value = '';
                }, 100, me);
            }
        },
        setClipboardData: function(data) {
            var me = this,
                clippy = window.clipboardData,
                area, focusEl;
            if (clippy && clippy.setData) {
                clippy.setData("text", data);
            } else {
                area = me.getHiddenTextArea().dom;
                focusEl = Ext.Element.getActiveElement(true);
                area.value = data;
                if (focusEl) {
                    focusEl.suspendFocusEvents();
                }
                area.focus();
                area.select();
                Ext.defer(function() {
                    area.value = '';
                    if (focusEl) {
                        focusEl.focus();
                        focusEl.resumeFocusEvents();
                    }
                }, 50);
            }
        },
        syncFormats: function() {
            var me = this,
                map = {},
                memory = me.getMemory(),
                system = me.getSystem(),
                i, s;
            if (system) {
                map[system] = 1;
            }
            if (memory) {
                for (i = memory.length; i-- > 0; ) {
                    s = memory[i];
                    map[s] = map[s] ? 3 : 2;
                }
            }
            return me.allFormats = map;
        },
        updateMemory: function() {
            this.allFormats = null;
        },
        updateSystem: function() {
            this.allFormats = null;
        },
        validateAction: Ext.privateFn
    }
});

Ext.define('Ext.menu.Item', {
    extend: Ext.Component,
    xtype: 'menuitem',
    alternateClassName: 'Ext.menu.TextItem',
    isMenuItem: true,
    menuExpandDelay: 200,
    menuHideDelay: 200,
    scope: null,
    destroyMenu: true,
    clickHideDelay: 0,
    hideOnClick: true,
    config: {
        href: null,
        target: null,
        handler: null,
        text: null,
        menu: {
            lazy: true,
            $value: null
        },
        menuAlign: 'tl-tr?',
        icon: null,
        iconCls: null,
        iconAlign: 'left',
        indented: null,
        separator: null
    },
    inheritUi: true,
    ariaRole: 'menuitem',
    focusable: true,
    classCls: Ext.baseCSSPrefix + 'menuitem',
    activeCls: Ext.baseCSSPrefix + 'active',
    hasLeftIconCls: Ext.baseCSSPrefix + 'has-left-icon',
    hasRightIconCls: Ext.baseCSSPrefix + 'has-right-icon',
    hasArrowCls: Ext.baseCSSPrefix + 'has-arrow',
    hasHrefCls: Ext.baseCSSPrefix + 'has-href',
    isMenuOwner: true,
    template: [
        {
            reference: 'bodyElement',
            tag: 'a',
            href: '#',
            cls: Ext.baseCSSPrefix + 'body-el ' + Ext.baseCSSPrefix + 'unselectable',
            children: [
                {
                    reference: 'leftIconWrapElement',
                    cls: Ext.baseCSSPrefix + 'left-icon-wrap-el ' + Ext.baseCSSPrefix + 'icon-wrap-el',
                    children: [
                        {
                            reference: 'leftIconElement',
                            cls: Ext.baseCSSPrefix + 'left-icon-el ' + Ext.baseCSSPrefix + 'icon-el ' + Ext.baseCSSPrefix + 'font-icon'
                        }
                    ]
                },
                {
                    html: '\xa0',
                    reference: 'textElement',
                    cls: Ext.baseCSSPrefix + 'text-el'
                },
                {
                    reference: 'rightIconWrapElement',
                    cls: Ext.baseCSSPrefix + 'right-icon-wrap-el ' + Ext.baseCSSPrefix + 'icon-wrap-el',
                    children: [
                        {
                            reference: 'rightIconElement',
                            cls: Ext.baseCSSPrefix + 'right-icon-el ' + Ext.baseCSSPrefix + 'icon-el ' + Ext.baseCSSPrefix + 'font-icon'
                        }
                    ]
                },
                {
                    reference: 'arrowElement',
                    cls: Ext.baseCSSPrefix + 'arrow-el ' + Ext.baseCSSPrefix + 'font-icon'
                }
            ]
        }
    ],
    ariaEl: 'bodyElement',
    focusEl: 'bodyElement',
    initialize: function() {
        this.callParent();
        this.syncHasIconCls();
        if (Ext.supports.Touch) {
            this.handleTouch();
        }
    },
    getFocusClsEl: function() {
        return this.el;
    },
    expandMenu: function(event) {
        var me = this,
            menu = me.getMenu();
        if (!me.getDisabled() && menu) {
            menu.parentMenu = me.parentMenu;
            me.hideOnClick = false;
            if (menu.isVisible()) {
                if (event && event.type === 'keydown') {
                    menu.focus();
                }
            } else {
                menu.autoFocus = !event || !event.pointerType;
                menu.showBy(me, me.getMenuAlign(), {
                    axisLock: true
                });
            }
        }
    },
    getRefItems: function(deep) {
        var menu = this.getMenu(),
            items;
        if (menu) {
            items = menu.getRefItems(deep);
            items.unshift(menu);
        }
        return items || [];
    },
    onFocusEnter: function(e) {
        var me = this;
        me.callParent([
            e
        ]);
        me.addCls(me.activeCls);
        me.activated = true;
        if (me.hasListeners.activate) {
            me.fireEvent('activate', me);
        }
        if (me.parentMenu) {
            me.parentMenu.setActiveItem(me);
        }
    },
    onFocusLeave: function(e) {
        var me = this,
            menu = me.menu;
        me.callParent([
            e
        ]);
        me.removeCls(me.activeCls);
        if (menu) {
            menu.hide();
        }
        me.activated = false;
        if (me.hasListeners.deactivate) {
            me.fireEvent('deactivate', me);
        }
        if (me.parentMenu) {
            me.parentMenu.setActiveItem(null);
        }
    },
    onRemoved: function(destroying) {
        this.callParent([
            destroying
        ]);
        this.parentMenu = null;
    },
    doDestroy: function() {
        var me = this;
        me.separatorElement = Ext.destroy(me.separatorElement);
        me.setMenu(null);
        me.linkClickListener = Ext.destroy(me.linkClickListener);
        me.callParent();
    },
    updateText: function(text) {
        if (text == null || text === '') {
            text = '\xa0';
        }
        this.textElement.dom.firstChild.data = text;
    },
    applyMenu: function(menu) {
        var me = this,
            ariaDom = me.ariaEl.dom;
        if (menu) {
            if (menu.isMenu) {
                menu.setConstrainAlign(Ext.getBody());
                menu.ownerCmp = me;
            } else {
                menu = Ext.menu.Menu.create(menu, {
                    ownerCmp: me,
                    $initParent: me,
                    constrainAlign: Ext.getBody()
                });
            }
            ariaDom.setAttribute('aria-haspopup', true);
            ariaDom.setAttribute('aria-owns', menu.id);
        } else {
            ariaDom.removeAttribute('aria-haspopup');
            ariaDom.removeAttribute('aria-owns');
        }
        me.toggleCls(me.hasArrowCls, !!menu);
        return menu;
    },
    updateMenu: function(menu, oldMenu) {
        if (oldMenu) {
            if (this.destroyMenu) {
                Ext.destroy(oldMenu);
            } else {
                oldMenu.parentMenu = null;
            }
        }
        this.menu = menu;
    },
    updateHref: function(href) {
        this.bodyElement.dom.href = href;
        this.toggleCls(this.hasHrefCls, !!href);
    },
    updateTarget: function(target) {
        this.bodyElement.dom.target = target;
    },
    updateIcon: function(icon) {
        var me = this,
            iconElement = (me.getIconAlign() === 'left') ? this.leftIconElement : this.rightIconElement;
        if (icon) {
            iconElement.setStyle('background-image', 'url(' + icon + ')');
        } else {
            iconElement.setStyle('background-image', '');
        }
        if (!me.isConfiguring) {
            me.syncHasIconCls();
        }
    },
    updateIconCls: function(iconCls, oldIconCls) {
        var me = this,
            iconElement = (me.getIconAlign() === 'left') ? this.leftIconElement : this.rightIconElement;
        if (iconCls) {
            iconElement.replaceCls(oldIconCls, iconCls);
        } else {
            iconElement.removeCls(oldIconCls);
        }
        if (!me.isConfiguring) {
            me.syncHasIconCls();
        }
    },
    updateIconAlign: function(iconAlign) {
        if (!this.isConfiguring) {
            this.syncHasIconCls();
        }
    },
    updateSeparator: function(separator) {
        var me = this,
            separatorElement = me.separatorElement;
        if (separator) {
            if (separatorElement) {
                separatorElement.show();
            } else {
                me.separatorElement = separatorElement = Ext.Element.create({
                    cls: Ext.baseCSSPrefix + 'menuseparator'
                });
                me.el.dom.insertBefore(separatorElement.dom, me.el.dom.firstChild);
            }
        } else if (separatorElement) {
            separatorElement.hide();
        }
    },
    privates: {
        handleTouch: function() {
            var me = this,
                linkEl = me.bodyElement;
            me.linkClickListener = linkEl.on({
                click: me.onClick,
                capture: true,
                translate: false,
                scope: me,
                destroyable: true
            });
        },
        onSpace: function(e) {
            return this.onClick(e);
        },
        onClick: function(e) {
            var me = this,
                href = me.getHref(),
                clickHideDelay = me.clickHideDelay,
                browserEvent = e.browserEvent,
                handler = me.getHandler(),
                isTouchEvent = e.pointerType === 'touch',
                clickResult;
            if (me.linkClickListener && !isTouchEvent && e.parentEvent) {
                e.stopEvent();
                return;
            }
            if ((!href || me.getDisabled()) && me.bodyElement.dom === e.getTarget('a')) {
                e.stopEvent();
                if (me.getDisabled()) {
                    return false;
                }
            }
            if (me.getDisabled() || me.handlingClick) {
                return;
            }
            if (me.hideOnClick && !me.getMenu()) {
                if (!clickHideDelay) {
                    me.hideParentMenus();
                } else {
                    me.hideParentMenusTimer = Ext.defer(me.hideParentMenus, clickHideDelay, me);
                }
            }
            clickResult = me.fireEvent('click', me, e);
            if (me.destroyed) {
                return;
            }
            if (clickResult !== false && handler) {
                Ext.callback(handler, me.scope, [
                    me,
                    e
                ], 0, me);
            }
            if (me.destroyed) {
                return;
            }
            if (href && e.type !== 'click' && !browserEvent.defaultPrevented) {
                me.handlingClick = true;
                me.bodyElement.dom.click();
                me.handlingClick = false;
            }
            return clickResult;
        },
        hideParentMenus: function() {
            var menu;
            for (menu = this.getRefOwner(); menu && ((menu.isMenu && menu.getFloated()) || menu.isMenuItem); menu = menu.getRefOwner()) {
                if (menu.isMenu) {
                    menu.hide();
                }
            }
        },
        hasIcon: function() {
            return !!(this.getIconCls() || this.getIcon());
        },
        syncHasIconCls: function() {
            var me = this,
                rightCls = me.hasRightIconCls,
                leftCls = me.hasLeftIconCls,
                iconAlign = me.getIconAlign();
            if (me.hasIcon()) {
                if (iconAlign === 'left') {
                    me.replaceCls(rightCls, leftCls);
                } else if (iconAlign === 'right') {
                    me.replaceCls(leftCls, rightCls);
                }
            } else {
                me.removeCls([
                    leftCls,
                    rightCls
                ]);
            }
        }
    }
});

Ext.define('Ext.menu.Manager', {
    singleton: true,
    alternateClassName: 'Ext.menu.MenuMgr',
    hideAll: function() {
        var allMenus = this.visible,
            len = allMenus.length,
            result = false,
            i;
        if (len) {
            allMenus = allMenus.slice();
            for (i = 0; i < len; i++) {
                allMenus[i].hide();
                result = true;
            }
        }
        return result;
    },
    privates: {
        groups: {},
        visible: [],
        constructor: function() {
            var me = this;
            me.onShow = function() {
                me.registerGlobalListeners();
                return me.onShow.apply(me, arguments);
            };
        },
        onGlobalScroll: function(scroller) {
            var allMenus = this.visible,
                len = allMenus.length,
                i, menu;
            if (len && scroller !== Ext.scroll.Scroller.viewport) {
                allMenus = allMenus.slice();
                for (i = 0; i < len; ++i) {
                    menu = allMenus[i];
                    if (scroller.contains(menu)) {
                        menu.hide();
                    }
                }
            }
        },
        checkActiveMenus: function(e) {
            var allMenus = this.visible,
                len = allMenus.length,
                i, menu,
                mousedownCmp = Ext.Component.from(e);
            if (len) {
                allMenus = allMenus.slice();
                for (i = 0; i < len; ++i) {
                    menu = allMenus[i];
                    if (!(menu.owns(e) || (mousedownCmp && mousedownCmp.isMenuOwner && mousedownCmp.getMenu() === menu))) {
                        menu.hide();
                    }
                }
            }
        },
        onShow: function(menu) {
            if (menu.getFloated()) {
                Ext.Array.include(this.visible, menu);
            }
        },
        onHide: function(menu) {
            if (menu.getFloated()) {
                Ext.Array.remove(this.visible, menu);
            }
        },
        registerGlobalListeners: function() {
            var me = this;
            delete me.onShow;
            Ext.on({
                mousedown: me.checkActiveMenus,
                scrollstart: me.onGlobalScroll,
                scope: me
            });
            var jasmine = window.jasmine;
            if (jasmine && jasmine.addAllowedListener) {
                jasmine.addAllowedListener('mousedown');
                jasmine.addAllowedListener('scrollstart');
            }
        }
    }
});

Ext.define('Ext.layout.VBox', {
    extend: Ext.layout.Box,
    alias: 'layout.vbox',
    config: {
        vertical: true
    }
});

Ext.define('Ext.menu.Menu', {
    extend: Ext.Panel,
    xtype: 'menu',
    isMenu: true,
    config: {
        align: 'tl-bl?',
        indented: true,
        separator: null,
        autoHide: null,
        groups: null
    },
    allowOtherMenus: false,
    ignoreParentClicks: false,
    mouseLeaveDelay: 50,
    defaultType: 'menuitem',
    autoSize: null,
    twoWayBindable: 'groups',
    keyMap: {
        scope: 'this',
        SPACE: 'onSpaceKey',
        ESC: 'onEscKey'
    },
    layout: {
        type: 'vbox',
        align: 'stretch'
    },
    classCls: Ext.baseCSSPrefix + 'menu',
    indentedCls: Ext.baseCSSPrefix + 'indented',
    hasSeparatorCls: Ext.baseCSSPrefix + 'has-separator',
    nonMenuItemCls: Ext.baseCSSPrefix + 'non-menuitem',
    allowFocusingDisabledChildren: true,
    border: true,
    defaultFocus: ':focusable',
    floated: true,
    focusable: true,
    focusableContainer: true,
    nameHolder: true,
    weighted: true,
    initialize: function() {
        var me = this,
            listeners = {
                click: me.onClick,
                mouseover: me.onMouseOver,
                scope: me
            };
        me.callParent();
        if (Ext.supports.Touch) {
            listeners.pointerdown = me.onMouseOver;
        }
        me.element.on(listeners);
        me.itemOverTask = new Ext.util.DelayedTask(me.handleItemOver, me);
        me.mouseMonitor = me.el.monitorMouseLeave(me.mouseLeaveDelay, me.onMouseLeave, me);
    },
    doDestroy: function() {
        var me = this;
        me.itemOverTask.cancel();
        Ext.menu.Manager.onHide(me);
        me.parentMenu = me.ownerCmp = null;
        if (me.rendered) {
            me.el.un(me.mouseMonitor);
        }
        me.callParent();
    },
    showBy: function(component, alignment, options) {
        this.callParent([
            component,
            alignment || this.getAlign(),
            options
        ]);
    },
    onFocusEnter: function(e) {
        var me = this,
            hierarchyState;
        me.callParent([
            e
        ]);
        me.mixins.focusablecontainer.onFocusEnter.call(me, e);
        if (me.getFloated()) {
            hierarchyState = me.getInherited();
            if (!hierarchyState.topmostFocusEvent) {
                hierarchyState.topmostFocusEvent = e;
            }
        }
    },
    onFocusLeave: function(e) {
        this.callParent([
            e
        ]);
        if (this.getAutoHide() !== false) {
            this.hide();
        }
    },
    onItemAdd: function(item, index) {
        this.callParent([
            item,
            index
        ]);
        this.syncItemIndentedCls(item);
        if (!item.isMenuItem && !item.isMenuSeparator) {
            item.addCls(this.nonMenuItemCls);
        }
    },
    onItemRemove: function(item, index, destroying) {
        this.callParent([
            item,
            index,
            destroying
        ]);
        item.removeCls(this.indentedCls, this.nonMenuItemCls);
    },
    beforeShow: function() {
        var me = this,
            parent;
        if (me.getFloated()) {
            parent = me.hasFloatMenuParent();
            if (!parent && !me.allowOtherMenus) {
                Ext.menu.Manager.hideAll();
            }
        }
        me.callParent(arguments);
    },
    afterShow: function() {
        var me = this,
            ariaDom = me.ariaEl.dom;
        me.callParent();
        Ext.menu.Manager.onShow(me);
        if (me.getFloated() && ariaDom) {
            ariaDom.setAttribute('aria-expanded', true);
        }
        if (me.getFloated()) {
            me.maxHeight = me.savedMaxHeight;
        }
        if (me.autoFocus) {
            me.focus();
        }
    },
    afterHide: function() {
        var me = this,
            ariaDom = me.ariaEl.dom;
        me.callParent();
        me.lastHide = Ext.Date.now();
        Ext.menu.Manager.onHide(me);
        if (me.getFloated() && ariaDom) {
            ariaDom.setAttribute('aria-expanded', false);
        }
        delete me.getInherited().topmostFocusEvent;
    },
    factoryItem: function(cfg) {
        var result;
        if (typeof cfg === 'string' && cfg[0] !== '@') {
            if (cfg === '-') {
                cfg = {
                    xtype: 'menuseparator'
                };
            } else {
                cfg = {};
            }
        }
        result = this.callParent([
            cfg
        ]);
        if (result.isMenuItem) {
            result.parentMenu = this;
        }
        return result;
    },
    updateIndented: function(indented) {
        var me = this;
        if (!me.isConfiguring) {
            me.bodyElement.toggleCls(me.hasSeparatorCls, !!(indented && me.getSeparator()));
            me.items.each(me.syncItemIndentedCls, me);
        }
    },
    updateSeparator: function(separator) {
        this.bodyElement.toggleCls(this.hasSeparatorCls, !!(separator && this.getIndented()));
    },
    privates: {
        applyItemDefaults: function(item) {
            item = this.callParent([
                item
            ]);
            if (!item.isComponent && !item.xtype && !item.xclass) {
                if (item.group || item.name) {
                    item.xtype = 'menuradioitem';
                }
                else if ('checked' in item) {
                    item.xtype = 'menucheckitem';
                }
            }
            return item;
        },
        applyGroups: function(groups, oldGroups) {
            var me = this,
                currentGroups = Ext.apply({}, oldGroups),
                isConfiguring = me.isConfiguring,
                groupName, members, len, i, item, value, oldValue;
            if (groups) {
                me.updatingGroups = true;
                for (groupName in groups) {
                    oldValue = currentGroups[groupName];
                    currentGroups[groupName] = value = groups[groupName];
                    if (!isConfiguring) {
                        members = me.lookupName(groupName);
                        for (i = 0 , len = members.length; i < len; i++) {
                            item = members[i];
                            item.setChecked(item.getValue() === value);
                        }
                        me.fireEvent('groupchange', me, groupName, value, oldValue);
                    }
                }
                me.updatingGroups = false;
            }
            return currentGroups;
        },
        processFocusableContainerKeyEvent: function(e) {
            var keyCode = e.keyCode,
                item;
            if (keyCode === e.ESC || (Ext.fly(e.target).is('input[type=checkbox]') && (keyCode === e.LEFT || keyCode === e.RIGHT || keyCode === e.UP || keyCode === e.DOWN))) {
                e.preventDefault();
                item = this.getItemFromEvent(e);
                e.target = item && item.focusEl.dom;
            }
            else if (keyCode === e.TAB && Ext.fly(e.target).is('input[type=text],textarea')) {
                e.preventDefault();
                item = this.getItemFromEvent(e);
                e.target = item && item.focusEl.dom;
                if (e.shiftKey) {
                    e.shiftKey = false;
                    e.keyCode = e.UP;
                } else {
                    e.keyCode = e.DOWN;
                }
            } else {
                return this.callParent([
                    e
                ]);
            }
            return e;
        },
        onEscKey: function(e) {
            if (this.getFloated()) {
                this.hide();
            }
        },
        onSpaceKey: function(e) {
            var clickedItem = this.getItemFromEvent(e);
            if (clickedItem && clickedItem.isMenuItem) {
                clickedItem.onSpace(e);
            }
        },
        onFocusableContainerLeftKey: function(e) {
            e.preventDefault();
            if (this.parentMenu) {
                this.hide();
            }
        },
        onFocusableContainerRightKey: function(e) {
            var clickedItem = this.getItemFromEvent(e);
            e.preventDefault();
            if (clickedItem) {
                clickedItem.expandMenu(e);
            }
        },
        onClick: function(e) {
            var me = this,
                type = e.type,
                clickedItem, clickResult,
                isKeyEvent = type === 'keydown',
                isTouchEvent = e.pointerType === 'touch';
            if (me.getDisabled()) {
                return e.stopEvent();
            }
            clickedItem = me.getItemFromEvent(e);
            if (clickedItem && clickedItem.isMenuItem) {
                if (!clickedItem.getMenu() || !me.ignoreParentClicks) {
                    clickResult = clickedItem.onClick(e);
                } else {
                    e.stopEvent();
                }
                if (me.destroyed) {
                    return;
                }
                if (clickedItem.getMenu() && clickResult !== false && (isKeyEvent || isTouchEvent)) {
                    clickedItem.expandMenu(e);
                }
            }
            if (!clickedItem || clickedItem.getDisabled()) {
                clickedItem = undefined;
            }
            me.fireEvent('click', me, clickedItem, e);
        },
        onMouseLeave: function(e) {
            var me = this;
            if (me.itemOverTask) {
                me.itemOverTask.cancel();
            }
            if (me.getDisabled()) {
                return;
            }
            me.fireEvent('mouseleave', me, e);
        },
        onMouseOver: function(e) {
            var me = this,
                activeItem = me.getActiveItem(),
                activeItemMenu = activeItem && activeItem.getMenu && activeItem.getMenu(),
                activeItemExpanded = activeItemMenu && activeItemMenu.isVisible(),
                isTouch = e.pointerType === 'touch',
                mouseEnter, overItem, el;
            if (!me.getDisabled()) {
                if (isTouch) {
                    mouseEnter = !me.el.contains(document.activeElement);
                } else {
                    mouseEnter = !me.el.contains(e.getRelatedTarget());
                }
                overItem = me.getItemFromEvent(e);
                if (overItem) {
                    if (isTouch) {
                        me.handleItemOver(e, overItem);
                    } else {
                        el = overItem.isMenuItem ? overItem.bodyElement : overItem.el;
                        if (!el.contains(e.getRelatedTarget())) {
                            me.itemOverTask.delay(activeItemExpanded ? me.mouseLeaveDelay : 0, null, null, [
                                e,
                                overItem
                            ]);
                        }
                    }
                }
                if (mouseEnter) {
                    me.fireEvent('mouseenter', me, e);
                }
                me.fireEvent('mouseover', me, overItem, e);
            }
        },
        handleItemOver: function(e, item) {
            var isMouseover = e.pointerType === 'mouse';
            if (!item.containsFocus && (isMouseover || item.isMenuItem)) {
                item.focus();
            }
            if (item.expandMenu && isMouseover) {
                item.expandMenu(e);
            }
        },
        getItemFromEvent: function(e) {
            var bodyDom = this.bodyElement.dom,
                toEl = e.getTarget(),
                component;
            while (toEl && toEl.parentNode !== bodyDom) {
                toEl = toEl.parentNode;
            }
            component = toEl && Ext.getCmp(toEl.id);
            if (component && component.isMenuItem && !e.within(component.bodyElement)) {
                component = null;
            }
            return component;
        },
        hasFloatMenuParent: function() {
            return this.parentMenu || this.up('menu[_floated=true]');
        },
        syncItemIndentedCls: function(item) {
            var indented = item.isMenuItem ? item.getIndented() : item.indented;
            item.toggleCls(this.indentedCls, !!(indented || (this.getIndented() && (indented !== false))));
        }
    },
    statics: {
        create: function(menu, config) {
            if (Ext.isArray(menu)) {
                menu = Ext.apply({
                    xtype: 'menu',
                    items: menu
                }, config);
            } else {
                menu = Ext.apply({
                    xtype: 'menu'
                }, menu, config);
            }
            return Ext.create(menu);
        }
    },
    deprecated: {
        '6.5': {
            configs: {
                plain: {
                    message: 'To achieve classic toolkit "plain" effect, use "indented".'
                },
                showSeparator: {
                    message: 'To achieve classic toolkit "showSeparator" effect, use "separator".'
                }
            }
        }
    }
});

Ext.define('Ext.field.Dirty', {
    extend: Ext.Mixin,
    mixinConfig: {
        id: 'dirtyfield',
        after: {
            _fixReference: 'fixDirtyState'
        }
    },
    config: {
        bubbleDirty: true,
        dirty: {
            lazy: true,
            $value: false
        }
    },
    dirty: false,
    _childDirtyState: null,
    adjustChildDirtyCount: function(dirty) {
        var me = this,
            childDirtyState = me._childDirtyState;
        if (childDirtyState) {
            if (childDirtyState.ready) {
                childDirtyState.counter += dirty ? 1 : -1;
                me.setDirty(!!childDirtyState.counter);
            } else if (dirty) {
                ++childDirtyState.counter;
            }
        }
    },
    beginSyncChildDirty: function() {
        this._childDirtyState = {
            counter: 0,
            ready: false
        };
    },
    finishSyncChildDirty: function() {
        var me = this,
            childDirtyState = me._childDirtyState,
            dirty = !!childDirtyState.counter;
        if (dirty !== me.dirty) {
            me.setDirty(dirty);
        } else if (dirty) {
            me.informParentDirty(dirty);
        }
        childDirtyState.ready = true;
    },
    fireDirtyChange: function() {
        this.fireEvent('dirtychange', this, this.dirty);
    },
    fixDirtyState: function() {
        var me = this;
        if (!me._childDirtyState && me.dirty) {
            me.informParentDirty(true);
        }
    },
    informParentDirty: function(dirty) {
        var me = this,
            parent = me.getBubbleDirty() && me.lookupNameHolder(),
            childDirtyState = me._childDirtyState,
            parentChildDirtyState = parent && parent._childDirtyState;
        if (parentChildDirtyState) {
            if (childDirtyState) {
                if (!childDirtyState.ready && parentChildDirtyState.ready) {
                    if (!dirty) {
                        return;
                    }
                }
            }
            parent.adjustChildDirtyCount(dirty, me);
        }
    },
    invalidateChildDirty: function() {
        this._childDirtyState = null;
    },
    isDirty: function() {
        if (Ext.referencesDirty) {
            Ext.fixReferences();
        }
        return this.getDirty();
    },
    updateDirty: function(dirty) {
        var me = this;
        me.dirty = dirty;
        if (!me.isDirtyInitializing) {
            if (me.fireEvent) {
                me.fireDirtyChange();
            }
            me.informParentDirty(dirty);
        }
    }
});

Ext.define('Ext.field.Field', {
    extend: Ext.Component,
    alternateClassName: 'Ext.form.Field',
    xtype: 'field',
    mixins: [
        Ext.field.Dirty
    ],
    isField: true,
    isFormField: true,
    cachedConfig: {
        bodyAlign: 'start',
        labelAlign: 'left',
        labelCls: null,
        labelTextAlign: 'left',
        labelWidth: null,
        labelMinWidth: null,
        labelWrap: false
    },
    config: {
        name: null,
        label: null,
        required: false,
        requiredMessage: 'This field is required',
        value: null,
        dataType: {
            cached: true,
            $value: null
        },
        validators: null,
        validationMessage: 'Is in the wrong format',
        validateDisabled: null,
        autoFitErrors: null,
        inline: null,
        error: null,
        errorMessage: null,
        errorTarget: 'qtip',
        errorTpl: null,
        errorTip: null,
        sideError: null,
        tipError: null,
        titleError: null,
        underError: null
    },
    htmlErrorsTpl: [
        '<tpl if="count == 1">',
        '<tpl for="errors">{.:htmlEncode}</tpl>',
        '<tpl elseif="count">',
        '<ul class="{listCls}">',
        '<tpl for="errors"><li>{.:htmlEncode}</li></tpl>',
        '</ul>',
        '</tpl>'
    ],
    plainErrorsTpl: [
        '<tpl if="count">',
        '<tpl for="errors" between="\\n">{.}</tpl>',
        '</tpl>'
    ],
    _errorTplMap: {
        title: 'plainErrorsTpl'
    },
    originalValue: null,
    focusable: true,
    classCls: Ext.baseCSSPrefix + 'field',
    requiredCls: Ext.baseCSSPrefix + 'required',
    noLabelWrapCls: Ext.baseCSSPrefix + 'no-label-wrap',
    invalidCls: Ext.baseCSSPrefix + 'invalid',
    noAutoFitErrorsCls: Ext.baseCSSPrefix + 'no-auto-fit-errors',
    inlineCls: Ext.baseCSSPrefix + 'inline',
    labelAlignVerticalCls: Ext.baseCSSPrefix + 'label-align-vertical',
    labelAlignHorizontalCls: Ext.baseCSSPrefix + 'label-align-horizontal',
    labeledCls: Ext.baseCSSPrefix + 'labeled',
    verticalLabelMap: {
        top: 1,
        placeholder: 1,
        bottom: 1
    },
    horizontalLabelMap: {
        left: 1,
        right: 1
    },
    nameable: true,
    validateOnInit: 'auto',
    errorElement: null,
    errorIconElement: null,
    errorMessageElement: null,
    element: {
        reference: 'element',
        classList: [
            Ext.supports.CSSMinContent ? '' : Ext.baseCSSPrefix + 'no-min-content',
            Ext.supports.PercentageSizeFlexBug ? Ext.baseCSSPrefix + 'has-percentage-size-flex-bug' : ''
        ]
    },
    initialize: function() {
        var me = this;
        me.callParent();
        if (me.getValue() === '' && me.validateOnInit === 'all') {
            me.validate();
        }
        me.handleFieldDefaults();
    },
    didValueChange: function(newVal, oldVal) {
        return !this.isEqual(newVal, oldVal);
    },
    getTemplate: function() {
        return [
            {
                reference: 'labelElement',
                cls: Ext.baseCSSPrefix + 'label-el',
                tag: 'label',
                children: [
                    {
                        reference: 'labelTextElement',
                        cls: Ext.baseCSSPrefix + 'label-text-el',
                        tag: 'span'
                    }
                ]
            },
            {
                reference: 'bodyWrapElement',
                cls: Ext.baseCSSPrefix + 'body-wrap-el',
                children: [
                    {
                        reference: 'bodyElement',
                        cls: Ext.baseCSSPrefix + 'body-el',
                        children: this.getBodyTemplate()
                    },
                    {
                        reference: 'errorElement',
                        cls: Ext.baseCSSPrefix + 'error-el',
                        children: [
                            {
                                reference: 'errorIconElement',
                                cls: Ext.baseCSSPrefix + 'error-icon-el ' + Ext.baseCSSPrefix + 'font-icon'
                            },
                            {
                                reference: 'errorMessageElement',
                                cls: Ext.baseCSSPrefix + 'error-message-el'
                            }
                        ]
                    }
                ]
            }
        ];
    },
    getBodyTemplate: Ext.emptyFn,
    initElement: function() {
        this.callParent();
        this.innerElement = this.innerElement || this.bodyElement;
    },
    onFocusLeave: function(e) {
        this.callParent([
            e
        ]);
        this.completeEdit();
    },
    completeEdit: Ext.emptyFn,
    updateBodyAlign: function(bodyAlign, oldBodyAlign) {
        var element = this.element;
        if (oldBodyAlign) {
            element.removeCls(Ext.baseCSSPrefix + 'body-align-' + oldBodyAlign);
        }
        if (bodyAlign) {
            element.addCls(Ext.baseCSSPrefix + 'body-align-' + bodyAlign);
        }
    },
    updateAutoFitErrors: function(autoFitErrors) {
        this.toggleCls(this.noAutoFitErrorsCls, autoFitErrors === false);
    },
    applyErrorTpl: function(tpl) {
        if (tpl && !tpl.isTemplate) {
            tpl = Ext.XTemplate.get(tpl);
        }
        return tpl;
    },
    applyDataType: function(field) {
        return field && Ext.Factory.dataField(field);
    },
    formatErrors: function(errors) {
        var me = this,
            tpl = me.getErrorTpl();
        if (!tpl) {
            tpl = me.lookupTpl(me._errorTplMap[me.getErrorTarget()] || 'htmlErrorsTpl');
        }
        return tpl.apply({
            count: errors ? errors.length : 0,
            label: me.getLabel(),
            errors: errors
        });
    },
    updateError: function(value) {
        var msg = this.formatErrors(Ext.Array.from(value));
        this.setErrorMessage(msg);
    },
    updateErrorMessage: function(msg) {
        var me = this,
            owner, errorTarget;
        me.fireEvent('errorchange', me, msg);
        if (me.preventMark) {
            return;
        }
        me.toggleInvalidCls(!!msg);
        errorTarget = me.getErrorTarget();
        switch (errorTarget) {
            case 'side':
                me.setSideError(msg);
                break;
            case 'qtip':
                me.setTipError(msg);
                break;
            case 'title':
                me.setTitleError(msg);
                break;
            case 'under':
                me.setUnderError(msg);
                break;
            case 'parent':
                owner = me.up('[onFieldErrorChange]');
                if (owner) {
                    owner.onFieldErrorChange(me, msg);
                };
                break;
        }
    },
    updateErrorTarget: function(target, oldTarget) {
        var me = this,
            error, owner;
        if (oldTarget) {
            me.removeCls(Ext.baseCSSPrefix + 'error-target-' + oldTarget);
            if (oldTarget === 'qtip') {
                me.setTipError(null);
            } else if (oldTarget === 'title') {
                me.setTitleError(null);
            } else if (oldTarget === 'side') {
                me.setSideError(null);
            } else if (oldTarget === 'under') {
                me.setUnderError(null);
            } else if (oldTarget === 'parent') {
                owner = me.up('[onFieldErrorChange]');
                if (owner) {
                    owner.onFieldErrorChange(me);
                }
            }
        }
        if (target) {
            me.addCls(Ext.baseCSSPrefix + 'error-target-' + target);
            if (!me.isConfiguring) {
                error = me.getError();
                if (error) {
                    if (target === 'qtip') {
                        me.setTipError(error);
                    } else if (target === 'title') {
                        me.setTitleError(error);
                    } else if (target === 'side') {
                        me.setSideError(error);
                    } else if (target === 'under') {
                        me.setUnderError(error);
                    } else if (target === 'parent') {
                        owner = me.up('[onFieldErrorChange]');
                        if (owner) {
                            owner.onFieldErrorChange(me, error);
                        }
                    }
                }
            }
        }
    },
    updateInline: function(inline) {
        this.toggleCls(this.inlineCls, inline);
    },
    updateSideError: function(error) {
        if (error) {
            error = Ext.apply({
                html: error
            }, this.getErrorTip());
        }
        this.errorElement.getData().qtip = error;
    },
    updateTipError: function(error) {
        if (error) {
            error = Ext.apply({
                html: error
            }, this.getErrorTip());
        }
        this.bodyElement.getData().qtip = error;
    },
    updateTitleError: function(error) {
        var dom = this.el.dom;
        if (error) {
            dom.setAttribute('title', error);
        } else {
            dom.removeAttribute('title');
        }
    },
    updateUnderError: function(error) {
        this.errorMessageElement.dom.innerHTML = error || '';
    },
    updateLabel: function(label) {
        this.labelTextElement.setHtml(label);
        this.el.toggleCls(this.labeledCls, !!label);
    },
    updateLabelAlign: function(newLabelAlign, oldLabelAlign) {
        var me = this,
            element = me.element;
        if (oldLabelAlign) {
            element.removeCls(Ext.baseCSSPrefix + 'label-align-' + oldLabelAlign);
        }
        if (newLabelAlign) {
            element.addCls(Ext.baseCSSPrefix + 'label-align-' + newLabelAlign);
        }
        element.toggleCls(me.labelAlignVerticalCls, newLabelAlign in me.verticalLabelMap);
        element.toggleCls(me.labelAlignHorizontalCls, newLabelAlign in me.horizontalLabelMap);
    },
    updateLabelTextAlign: function(labelTextAlign, oldLabelTextAlign) {
        var element = this.element;
        if (oldLabelTextAlign) {
            element.removeCls(Ext.baseCSSPrefix + 'label-text-align-' + oldLabelTextAlign);
        }
        if (labelTextAlign) {
            element.addCls(Ext.baseCSSPrefix + 'label-text-align-' + labelTextAlign);
        }
    },
    updateLabelCls: function(newLabelCls, oldLabelCls) {
        var labelElement = this.labelElement;
        if (newLabelCls) {
            labelElement.addCls(newLabelCls);
        }
        if (oldLabelCls) {
            labelElement.removeCls(oldLabelCls);
        }
    },
    updateLabelWidth: function(labelWidth) {
        this.labelElement.setWidth(labelWidth);
    },
    updateLabelMinWidth: function(labelMinWidth) {
        this.labelElement.setStyle('min-width', Ext.Element.addUnits(labelMinWidth));
    },
    updateLabelWrap: function(labelWrap) {
        this.element.toggleCls(this.noLabelWrapCls, !labelWrap);
    },
    updateName: function(newName) {
        this.name = newName;
    },
    updateRequired: function(required) {
        var me = this;
        me.element.toggleCls(me.requiredCls, required);
        if (!me.isConfiguring) {
            me.validate();
        }
    },
    updateRequiredMessage: function() {
        if (!this.isConfiguring) {
            this.validate();
        }
    },
    updateDisabled: function(disabled, oldDisabled) {
        this.callParent([
            disabled,
            oldDisabled
        ]);
        if (!this.isConfiguring) {
            this.validate();
        }
    },
    updateValidateDisabled: function() {
        if (!this.isConfiguring) {
            this.validate();
        }
    },
    applyValue: function(value) {
        if (this.isConfiguring) {
            this.originalValue = value;
        }
        return value;
    },
    updateValue: function(value, oldValue) {
        var me = this,
            rawToValue;
        if (!(Ext.isEmpty(value) && Ext.isEmpty(oldValue))) {
            me.validate();
        }
        if (value !== oldValue) {
            rawToValue = me.rawToValue(me.processRawValue(me.getRawValue()));
            if (!Ext.isEmpty(rawToValue, true) && String(value) !== String(rawToValue)) {
                me._value = value = rawToValue;
            }
            if (!me.isConfiguring) {
                me.fireEvent('change', me, value, oldValue);
            }
        }
        me.setDirty(me.isDirty());
    },
    reset: function() {
        this.setValue(this.originalValue);
        return this;
    },
    resetOriginalValue: function() {
        this.originalValue = this.getValue();
        this.setDirty(false);
    },
    isDirty: function() {
        return !this.isEqual(this.getValue(), this.originalValue);
    },
    toggleInvalidCls: function(hasError) {
        this.el[hasError ? 'addCls' : 'removeCls'](this.invalidCls);
    },
    markInvalid: function(messages) {
        this.setError(messages);
    },
    clearInvalid: function() {
        this.setError(null);
    },
    isValid: function() {
        return !this.getError();
    },
    isEqual: function(value1, value2) {
        return String(value1) === String(value2);
    },
    applyValidators: function(validators) {
        var me = this,
            i, len, ret;
        validators = (validators && !Ext.isArray(validators)) ? [
            validators
        ] : validators;
        len = validators && validators.length;
        ret = len ? [] : null;
        for (i = 0; i < len; ++i) {
            ret.push(me.decodeValidator(validators[i]));
        }
        return ret;
    },
    wrapValidatorFn: function(fn, validator) {
        var me = this,
            scope = validator && validator.scope;
        return new Ext.data.validator.Validator(function(value) {
            return Ext.callback(fn, scope, [
                value
            ], 0, me);
        });
    },
    doValidate: function(value, errors, skipLazy) {
        var validators = this.getValidators(),
            len = validators && validators.length,
            i, result, validator;
        for (i = 0; i < len; ++i) {
            validator = validators[i];
            if (!skipLazy || !validator.lazy) {
                result = validator.validate(value);
                if (result !== true) {
                    if (!result || typeof result !== 'string') {
                        Ext.raise('Validator did not return a valid result.');
                    }
                    errors.push(result);
                }
            }
        }
    },
    parseValue: Ext.identityFn,
    validate: function(skipLazy) {
        var me = this,
            empty, errors, field, record, validity, value;
        if (me.isConfiguring && me.validateOnInit === 'none') {
            return true;
        }
        if (!me.getDisabled() || me.getValidateDisabled()) {
            errors = [];
            if (me.isInputField && !me.isSelectField) {
                value = me.getInputValue();
                empty = !value;
                validity = empty && me.inputElement.dom.validity;
                if (validity && validity.badInput) {
                    errors.push(me.badFormatMessage);
                    empty = false;
                }
            } else {
                value = me.getValue();
                empty = value === '' || value == null;
            }
            if (empty && me.getRequired()) {
                errors.push(me.getRequiredMessage());
            } else if (!errors.length) {
                if (!empty) {
                    value = me.parseValue(value, errors);
                }
                if (!errors.length) {
                    field = me._validationField;
                    record = me._validationRecord;
                    if (field && record) {
                        field.validate(value, null, errors, record);
                    }
                    if (!empty) {
                        me.doValidate(value, errors, skipLazy);
                    }
                }
            }
            if (errors.length) {
                me.setError(errors);
                return false;
            }
        }
        me.setError(null);
        return true;
    },
    getFocusClsEl: function() {
        return this.element;
    },
    updateHeight: function(height, oldHeight) {
        this.callParent([
            height,
            oldHeight
        ]);
        this.syncFormLayoutHeight();
    },
    onAdded: function(parent, instanced) {
        this.callParent([
            parent,
            instanced
        ]);
        this.syncFormLayoutHeight();
        this.validateLayout();
    },
    onRemoved: function(destroying) {
        this.callParent([
            destroying
        ]);
        this.syncFormLayoutHeight();
    },
    rawToValue: Ext.identityFn,
    processRawValue: Ext.identityFn,
    transformRawValue: Ext.identityFn,
    getRawValue: function() {
        var me = this,
            value = me.inputElement ? me.inputElement.getValue() : Ext.valueFrom(me.rawValue, '');
        me.rawValue = value;
        return value;
    },
    handleFieldDefaults: function() {
        var me = this,
            inheritedState = me.getInherited(),
            fieldDefaults, key, prop, initialConfig, value;
        if (inheritedState) {
            fieldDefaults = inheritedState.fieldDefaults;
            if (fieldDefaults) {
                initialConfig = me.initialConfig;
                for (key in fieldDefaults) {
                    if (!initialConfig[key]) {
                        prop = Ext.util.Format.capitalize(key);
                        value = fieldDefaults[key];
                        if (me['set' + prop]) {
                            me['set' + prop](value);
                        } else {
                            me[key] = value;
                        }
                    }
                }
            }
        }
    },
    serialize: function() {
        var me = this,
            value = me.getValue(),
            dataField;
        if (value != null) {
            dataField = me._validationField || me.getDataType();
            if (dataField && dataField.serialize) {
                value = dataField.serialize(value);
            }
        }
        return value;
    },
    privates: {
        syncFormLayoutHeight: function() {
            var me = this,
                parent = me.parent,
                height = me.getHeight();
            if (!(height && parent && parent.getLayout().isFormLayout)) {
                height = null;
            }
            me.bodyElement.setHeight(height);
        },
        validateLayout: function() {
            var errorTarget = this.getErrorTarget(),
                parent = this.parent;
            if (this.isInner && parent && parent.getLayout().isFormLayout) {
                this.setLabelAlign('left');
                if (errorTarget === 'under') {
                    this.setErrorTarget('side');
                }
            }
        },
        applyBind: function(bind, currentBindings) {
            var me = this,
                valueBinding = currentBindings && currentBindings.value,
                bindings, newValueBind;
            bindings = me.callParent([
                bind,
                currentBindings
            ]);
            if (bindings) {
                newValueBind = bindings.value;
                me.hasBindingValue = !!newValueBind;
                if (newValueBind !== valueBinding && me.getInherited().modelValidation) {
                    me.updateValueBinding(bindings);
                }
            }
            return bindings;
        },
        updateValueBinding: function(bindings) {
            var me = this,
                newBinding = bindings.value,
                fieldBinding = bindings.$fieldBinding;
            if (fieldBinding) {
                fieldBinding.destroy();
                bindings.$fieldBinding = null;
            }
            if (newBinding && newBinding.bindValidationField) {
                me.fieldBinding = newBinding.bindValidationField('setValidationField', me);
            }
        },
        setValidationField: function(field, record) {
            this._validationField = field;
            this._validationRecord = record;
        },
        decodeValidator: function(validator) {
            var type = Ext.typeOf(validator),
                result = validator.fn;
            if (type === 'function') {
                result = this.wrapValidatorFn(validator);
            } else if (type === 'regexp') {
                result = Ext.Factory.validator({
                    type: 'format',
                    matcher: validator
                });
            } else if (type === 'object' && result && !validator.isValidator) {
                result = this.wrapValidatorFn(result, validator);
            } else {
                result = Ext.Factory.validator(validator);
            }
            return result;
        }
    }
});

Ext.define('Ext.field.Input', {
    extend: Ext.field.Field,
    xtype: 'inputfield',
    isInputField: true,
    tag: 'input',
    config: {
        inputType: {
            cached: true,
            $value: 'text'
        },
        readOnly: false,
        inputValue: null
    },
    focusEl: 'inputElement',
    ariaEl: 'inputElement',
    inputTabIndex: 0,
    getBodyTemplate: function() {
        return [
            this.getInputTemplate()
        ];
    },
    getInputTemplate: function() {
        return {
            tag: this.tag,
            reference: 'inputElement',
            tabindex: this.inputTabIndex,
            cls: Ext.baseCSSPrefix + 'input-el'
        };
    },
    initElement: function() {
        this.callParent();
        this.labelElement.dom.setAttribute('for', this.inputElement.id);
    },
    updateDisabled: function(disabled, oldDisabled) {
        this.callParent([
            disabled,
            oldDisabled
        ]);
        this.inputElement.dom.disabled = !!disabled;
    },
    updateInputType: function(newInputType) {
        this.setInputAttribute('type', newInputType);
    },
    updateName: function(name, oldName) {
        this.callParent([
            name,
            oldName
        ]);
        this.setInputAttribute('name', name);
    },
    updateReadOnly: function(readOnly) {
        this.setInputAttribute('readonly', readOnly ? true : null);
    },
    updateValue: function(value, oldValue) {
        if (this.canSetInputValue()) {
            this.setInputValue(value);
        }
        this.callParent([
            value,
            oldValue
        ]);
    },
    applyInputValue: function(value) {
        return (value != null) ? (value + '') : '';
    },
    completeEdit: function() {
        var me = this,
            value = me.getInputValue(),
            parsedValue = me.parseValue(value);
        if (parsedValue !== null) {
            me.setInputValue(me.getValue());
        }
    },
    updateInputValue: function(value) {
        var inputElement = this.inputElement.dom;
        if (inputElement.value !== value) {
            inputElement.value = value;
        }
    },
    reset: function() {
        var me = this,
            original = me.originalValue;
        if (me.isEqual(original, me.getValue())) {
            me.setInputValue(original);
            if (!me.isValid()) {
                me.validate();
            }
        } else {
            me.setValue(original);
        }
        return me;
    },
    privates: {
        canSetInputValue: function() {
            return true;
        },
        setInputAttribute: function(attribute, newValue) {
            var inputElement = this.inputElement.dom;
            if (!Ext.isEmpty(newValue, true)) {
                inputElement.setAttribute(attribute, newValue);
            } else {
                inputElement.removeAttribute(attribute);
            }
        }
    },
    deprecated: {
        '6.5': {
            configs: {
                inputCls: null
            }
        }
    }
});

Ext.define('Ext.field.trigger.Base', {
    extend: Ext.Widget,
    alias: 'trigger.base',
    mixins: [
        Ext.mixin.Factoryable
    ],
    factoryConfig: {
        defaultType: 'trigger',
        aliasPrefix: 'trigger.'
    },
    isTrigger: true,
    config: {
        field: null,
        group: null,
        side: null,
        name: null,
        triggers: null
    },
    classCls: Ext.baseCSSPrefix + 'trigger',
    groupedCls: Ext.baseCSSPrefix + 'grouped',
    inheritUi: true,
    statics: {
        sort: function(triggers) {
            Ext.sortByWeight(triggers);
            return triggers;
        }
    },
    doDestroy: function() {
        var triggers = this.getTriggers(),
            i, ln;
        if (triggers) {
            for (i = 0 , ln = triggers.length; i < ln; i++) {
                triggers[i].destroy();
            }
        }
        this.setTriggers(null);
        this.callParent();
    },
    updateField: function(field) {
        this.field = this.ownerCmp = field;
        this.doInheritUi();
    },
    updateGroup: function(group) {
        if (!this.isConfiguring) {
            this.getField().syncTriggers();
        }
    },
    updateSide: function() {
        if (!this.isConfiguring) {
            this.getField().syncTriggers();
        }
    },
    updateTriggers: function(triggers) {
        var me = this,
            dom = me.element.dom,
            i, ln;
        me.toggleCls(me.groupedCls, !!(triggers && triggers.length));
        if (triggers) {
            for (i = 0 , ln = triggers.length; i < ln; i++) {
                dom.appendChild(triggers[i].element.dom);
            }
        }
    }
});

Ext.define('Ext.field.trigger.Trigger', {
    extend: Ext.field.trigger.Base,
    xtype: 'trigger',
    alias: 'trigger.trigger',
    config: {
        handler: null,
        iconCls: null,
        repeat: null,
        scope: null,
        focusOnTap: true
    },
    interactiveCls: Ext.baseCSSPrefix + 'interactive',
    template: [
        {
            reference: 'iconElement',
            classList: [
                Ext.baseCSSPrefix + 'icon-el',
                Ext.baseCSSPrefix + 'font-icon'
            ]
        }
    ],
    constructor: function(config) {
        var me = this,
            repeat;
        me.callParent([
            config
        ]);
        repeat = me.getRepeat();
        if (repeat) {
            me.repeater = new Ext.util.ClickRepeater(Ext.apply({
                target: me,
                preventDefault: true,
                listeners: {
                    mousedown: 'onClickRepeaterTouchStart',
                    mouseup: 'onClickRepeaterTouchEnd',
                    click: 'onClickRepeaterClick',
                    scope: me
                }
            }, repeat));
        } else {
            me.element.on({
                click: 'onClick',
                mousedown: 'onMouseDown',
                scope: me
            });
        }
    },
    doDestroy: function() {
        Ext.destroyMembers(this, 'repeater');
        this.callParent();
    },
    onClickRepeaterClick: function(clickRepeater, e) {
        this.onClick(e);
    },
    onClick: function(e) {
        var me = this,
            handler = !me.getDisabled() && me.getHandler(),
            field = me.getField(),
            focusEl;
        if (field) {
            if (e.pointerType !== 'mouse') {
                e.preventDefault();
                if (me.getFocusOnTap()) {
                    focusEl = field.getFocusTrap ? field.getFocusTrap() : field.getFocusEl();
                    if (focusEl.dom !== document.activeElement) {
                        if (me.isExpandTrigger) {
                            field.focusingFromExpandTrigger = true;
                        }
                        field.focus();
                    }
                }
            }
            if (handler) {
                Ext.callback(handler, me.getScope(), [
                    field,
                    me,
                    e
                ], null, field);
            }
        }
    },
    onMouseDown: function(e) {
        var field;
        if (e.pointerType === 'mouse') {
            field = this.getFocusOnTap() && this.getField();
            if (field) {
                field.focus();
            }
            e.preventDefault();
        }
    },
    onClickRepeaterTouchStart: function(clickRepeater, e) {
        this.onMouseDown(e);
    },
    onClickRepeaterTouchEnd: function(clickRepeater, e) {
        var me = this,
            field = me.field;
        Ext.callback(me.endHandler, me.scope, [
            field,
            me,
            e
        ], 0, field);
    },
    updateHandler: function(handler) {
        this.toggleCls(this.interactiveCls, !!handler);
    },
    updateIconCls: function(iconCls, oldIconCls) {
        this.iconElement.replaceCls(oldIconCls, iconCls);
    }
});

Ext.define('Ext.field.trigger.Clear', {
    extend: Ext.field.trigger.Trigger,
    xtype: 'cleartrigger',
    alias: 'trigger.clear',
    classCls: Ext.baseCSSPrefix + 'cleartrigger',
    weight: -1000,
    hidden: true,
    handler: 'onClearIconTap',
    scope: 'this'
});

Ext.define('Ext.field.Text', {
    extend: Ext.field.Input,
    xtype: 'textfield',
    alternateClassName: 'Ext.form.Text',
    config: {
        clearable: true,
        placeholder: null,
        maxLength: null,
        autoComplete: null,
        autoCapitalize: null,
        autoCorrect: null,
        autoHideInputMask: null,
        inputMask: null,
        pattern: null,
        triggers: {
            clear: {
                type: 'clear'
            }
        },
        editable: true,
        bodyAlign: 'stretch',
        labelInPlaceholder: {
            lazy: true,
            $value: true
        },
        textAlign: null
    },
    cachedConfig: {
        animateUnderline: false,
        parseValidator: null
    },
    bubbleEvents: [
        'action'
    ],
    badFormatMessage: 'Value does not match the required format',
    defaultBindProperty: 'value',
    twoWayBindable: {
        value: 1
    },
    publishes: {
        value: 1
    },
    inputType: 'text',
    classCls: Ext.baseCSSPrefix + 'textfield',
    focusedCls: Ext.baseCSSPrefix + 'focused',
    emptyCls: Ext.baseCSSPrefix + 'empty',
    webkitBorderBoxBugCls: Ext.baseCSSPrefix + 'webkit-border-box-bug',
    requiredIndicator: '*',
    getBodyTemplate: function() {
        var template = [
                {
                    reference: 'beforeInputElement',
                    cls: Ext.baseCSSPrefix + 'before-input-el'
                }
            ];
        template.push(this.getInputTemplate());
        template.push({
            reference: 'afterInputElement',
            cls: Ext.baseCSSPrefix + 'after-input-el'
        });
        return [
            {
                reference: 'inputWrapElement',
                cls: Ext.baseCSSPrefix + 'input-wrap-el' + (Ext.supports.WebKitInputTableBoxModelBug ? (' ' + this.webkitBorderBoxBugCls) : ''),
                children: template
            },
            {
                reference: 'underlineElement',
                cls: Ext.baseCSSPrefix + 'underline-el'
            }
        ];
    },
    initialize: function() {
        var me = this;
        if (Ext.isRobot) {
            me.focusedInputDelay = 0;
        }
        me.callParent();
        me.inputElement.on({
            keyup: 'onKeyUp',
            keydown: 'onKeyDown',
            keypress: 'onKeyPress',
            paste: 'onPaste',
            mousedown: 'onMouseDown',
            input: {
                fn: 'onInput',
                delegated: false
            },
            scope: me
        });
        me.syncEmptyState();
    },
    clearValue: function() {
        var me = this,
            inputMask = me.getInputMask();
        if (inputMask) {
            inputMask.showEmptyMask(me, true);
        } else {
            me.forceSetValue('');
        }
        me.syncEmptyState();
    },
    isEqual: function(value1, value2) {
        var v1 = this.transformValue(value1),
            v2 = this.transformValue(value2);
        return v1 === v2;
    },
    forceSetValue: function(value) {
        this.forceInputChange = true;
        this.setValue(value);
        this.forceInputChange = false;
    },
    transformValue: function(value) {
        if (value == null) {
            value = '';
        }
        return value;
    },
    applyInputMask: function(value, instance) {
        var InputMask = Ext.field['InputMask'];
        if (value) {
            if (!InputMask) {
                Ext.raise('Missing Ext.field.InputMask (required to use inputMask)');
            }
        }
        return value ? InputMask.from(value, instance) : null;
    },
    updateInputMask: function(inputMask, previous) {
        this.hasMask = false;
        if (previous) {
            previous.release();
        }
        if (inputMask) {
            this.hasMask = true;
            inputMask.syncPattern(this);
        }
    },
    doValidate: function(value, errors, skipLazy) {
        this.callParent([
            value,
            errors,
            skipLazy
        ]);
        if (!skipLazy) {
            var inputMask = this.getInputMask();
            if (inputMask && !inputMask.isFilled(value) && value !== inputMask._mask) {
                errors.push(this.badFormatMessage);
            }
        }
    },
    parseValue: function(value, errors) {
        var me = this,
            parser = me.getParseValidator(),
            field, i, k, len, v, validators;
        if (parser) {
            field = me._validationField;
            for (k = 2; k-- > 0; ) {
                validators = k ? me.getValidators() : (field && field.getValidators());
                len = validators && validators.length;
                for (i = 0; i < len; ++i) {
                    v = validators[i];
                    if (v.parse) {
                        v = v.parse(value);
                        if (v !== null) {
                            return v;
                        }
                    }
                }
            }
            value = parser.parse(value);
            if (value === null && errors) {
                errors.push(me.badFormatMessage);
            }
        }
        return value;
    },
    applyValue: function(value, oldValue) {
        if (value && typeof value === 'string') {
            value = this.parseValue(value);
            if (value === null) {
                return;
            }
        }
        return this.transformValue(this.callParent([
            value,
            oldValue
        ]));
    },
    updateInputValue: function(value, oldValue) {
        var me = this,
            inputMask = me.getInputMask();
        me.callParent([
            value,
            oldValue
        ]);
        me.syncEmptyState();
        me.syncLabelPlaceholder(false);
        if (inputMask) {
            inputMask.onChange(this, value, oldValue);
        }
    },
    updateTextAlign: function(newAlign, oldAlign) {
        var element = this.element;
        if (oldAlign) {
            element.removeCls(Ext.baseCSSPrefix + 'text-align-' + oldAlign);
        }
        if (newAlign) {
            element.addCls(Ext.baseCSSPrefix + 'text-align-' + newAlign);
        }
    },
    updatePlaceholder: function(value) {
        this.setInputAttribute('placeholder', value);
    },
    applyMaxLength: function(maxLength) {
        if (maxLength !== null && typeof maxLength !== 'number') {
            Ext.raise("Ext.field.Text: [applyMaxLength] value which is not a number");
        }
        return maxLength;
    },
    updateMaxLength: function(newMaxLength) {
        this.setInputAttribute('maxlength', newMaxLength);
    },
    applyAutoComplete: function(value) {
        return value === true || value === 'on';
    },
    updateAutoComplete: function(value) {
        this.setInputAttribute('autocomplete', value ? 'on' : 'off');
    },
    applyAutoCapitalize: function(value) {
        return value === true || value === 'on';
    },
    updateAutoCapitalize: function(value) {
        this.setInputAttribute('autocapitalize', value ? 'on' : 'off');
    },
    applyAutoCorrect: function(value) {
        return value === true || value === 'on';
    },
    updateAutoCorrect: function(value) {
        this.setInputAttribute('autocorrect', value ? 'on' : 'off');
    },
    updateReadOnly: function(newReadOnly) {
        var me = this,
            triggers = me.getTriggers(),
            isEditable = me.getEditable(),
            triggerName, trigger;
        me.callParent([
            newReadOnly || !isEditable
        ]);
        for (triggerName in triggers) {
            trigger = triggers[triggerName];
            if (trigger.disableOnReadOnly !== false) {
                trigger.setDisabled(newReadOnly);
            }
        }
        me.syncEmptyState();
    },
    updateEditable: function(newEditable) {
        var triggers = this.getTriggers(),
            isReadOnly = this.getReadOnly(),
            triggerName, trigger;
        this.updateReadOnly(!newEditable);
        for (triggerName in triggers) {
            trigger = triggers[triggerName];
            if (trigger.disableOnReadOnly !== false) {
                triggers[triggerName].setDisabled(isReadOnly);
            }
        }
    },
    updatePattern: function(pattern) {
        this.setInputAttribute('pattern', pattern);
    },
    updateDisabled: function(disabled, oldDisabled) {
        this.callParent([
            disabled,
            oldDisabled
        ]);
        this.syncEmptyState();
    },
    updateClearable: function(clearable, oldClearable) {
        var me = this,
            triggers, clearTrigger;
        if (!me.isConfiguring) {
            triggers = me.getTriggers();
            clearTrigger = triggers && triggers.clear;
            if (clearable) {
                if (!clearTrigger) {
                    me.addTrigger('clear', 'clear');
                }
            } else if (clearTrigger) {
                me.removeTrigger('clear');
            }
        }
    },
    applyTriggers: function(triggers, oldTriggers) {
        var me = this,
            instances = oldTriggers || {},
            clearable = me.getClearable(),
            name, trigger, oldTrigger;
        for (name in triggers) {
            trigger = triggers[name];
            oldTrigger = instances[name];
            if (oldTrigger) {
                oldTrigger.destroy();
            }
            if (trigger) {
                if (!clearable && (name === 'clear')) {
                    
                    continue;
                }
                instances[name] = me.createTrigger(name, trigger);
            }
        }
        return instances;
    },
    updateTriggers: function() {
        this.syncTriggers();
    },
    addTrigger: function(name, trigger) {
        var me = this,
            triggers = me.getTriggers(),
            triggerConfig;
        if (triggers && triggers[name]) {
            Ext.raise('Trigger with name "' + name + '" already exists.');
        }
        if (typeof name !== 'string') {
            Ext.raise('Cannot add trigger. Key must be a string.');
        }
        if (typeof trigger !== 'string' && !Ext.isObject(trigger)) {
            Ext.raise('Cannot add trigger "' + name + '". A config or instance is required.');
        }
        trigger = me.createTrigger(name, trigger);
        if (triggers) {
            triggers[name] = trigger;
            me.syncTriggers();
        } else {
            triggerConfig = {};
            triggerConfig[name] = trigger;
            me.setTriggers(triggerConfig);
        }
        return trigger;
    },
    removeTrigger: function(trigger, destroy) {
        var me = this,
            triggers = me.getTriggers(),
            name = trigger,
            triggerEl;
        if (name.isTrigger) {
            name = trigger.getName();
        } else {
            trigger = triggers[name];
        }
        if (!name) {
            Ext.raise('Trigger not found.');
        } else if (!triggers[name]) {
            Ext.raise('Cannot remove trigger. Trigger with name "' + name + '" not found.');
        }
        delete triggers[name];
        if (destroy !== false) {
            trigger.destroy();
        } else {
            triggerEl = trigger.el.dom;
            triggerEl.parentNode.removeChild(triggerEl);
        }
        this.syncTriggers();
        return trigger;
    },
    fireKey: function(e) {
        if (e.isSpecialKey()) {
            this.fireEvent('specialkey', this, e);
        }
    },
    onKeyPress: function(event) {
        var me = this,
            inputMask = me.getInputMask();
        if (inputMask) {
            inputMask.onKeyPress(me, me.getValue(), event);
        }
        me.fireEvent('keypress', me, event);
        if (!Ext.supports.SpecialKeyDownRepeat) {
            me.fireKey(event);
        }
    },
    onKeyDown: function(event) {
        var me = this,
            inputMask = me.getInputMask();
        me.lastKeyTime = Date.now();
        if (inputMask) {
            inputMask.onKeyDown(me, me.getValue(), event);
        }
        me.ignoreInput = true;
        if (Ext.supports.SpecialKeyDownRepeat) {
            me.fireKey(event);
        }
        me.fireAction('keydown', [
            me,
            event
        ], 'doKeyDown');
    },
    doKeyDown: Ext.emptyFn,
    onKeyUp: function(e) {
        this.fireAction('keyup', [
            this,
            e
        ], 'doKeyUp');
    },
    doKeyUp: function(me, e) {
        me.syncEmptyState();
        if (e.browserEvent.keyCode === 13) {
            me.fireAction('action', [
                me,
                e
            ], 'doAction');
        }
    },
    onInput: function(e) {
        var me = this,
            inputEl = me.inputElement.dom,
            value = inputEl.value,
            inputMask = me.getInputMask(),
            parseErrors, oldValue;
        if (inputMask) {
            inputMask.processAutocomplete(this, value);
            value = inputEl.value;
        }
        me._inputValue = value;
        if (!me.hasFocus && me.getLabelAlign() === 'placeholder') {
            me.syncLabelPlaceholder(true);
        }
        if (value) {
            parseErrors = [];
            value = me.parseValue(value, parseErrors);
        }
        if (parseErrors && parseErrors.length) {
            me.setError(parseErrors);
        } else {
            oldValue = me.getValue();
            me.setValue(value);
            if (me.getValue() === oldValue) {
                me.validate();
            }
        }
        me.syncEmptyState();
        if (me.ignoreInput) {
            me.ignoreInput = false;
            return;
        }
        Ext.defer(function() {
            if (!me.ignoreInput && !me.destroyed) {
                me.fireEvent('keyup', e);
                me.ignoreInput = false;
            }
        }, 10);
    },
    doAction: function() {
        if (document.documentElement.getBoundingClientRect().top < 0) {
            this.blur();
        }
    },
    onClearIconTap: function(input, e) {
        this.fireAction('clearicontap', [
            this,
            input,
            e
        ], 'doClearIconTap');
    },
    doClearIconTap: function() {
        this.clearValue();
    },
    onFocusEnter: function(event) {
        var me = this,
            inputMask = me.getInputMask();
        me.callParent([
            event
        ]);
        me.addCls(me.focusedCls);
        me.syncLabelPlaceholder(true);
        if (inputMask) {
            inputMask.onFocus(me, me.getValue());
        }
    },
    onFocusLeave: function(event) {
        var me = this,
            inputMask = me.getInputMask();
        me.callParent([
            event
        ]);
        me.removeCls(me.focusedCls);
        me.syncLabelPlaceholder(true);
        if (inputMask) {
            inputMask.onBlur(me, me.getValue());
        }
    },
    onPaste: function(e) {
        this.forceInputChange = true;
        this.handlePaste(e);
        this.forceInputChange = false;
    },
    getCaretPos: function() {
        return this.inputElement.getCaretPos();
    },
    setCaretPos: function(pos) {
        this.inputElement.setCaretPos(pos);
    },
    getTextSelection: function() {
        return this.inputElement.getTextSelection();
    },
    select: function(start, end, direction) {
        if (this.containsFocus) {
            this.inputElement.selectText(start, end, direction);
        }
        return this;
    },
    reset: function() {
        this.callParent();
        this.syncEmptyState();
    },
    onClick: function(e) {
        this.fireEvent('click', e);
    },
    onMouseDown: function(e) {
        this.fireEvent('mousedown', e);
    },
    trimValueToMaxLength: function() {
        var me = this,
            maxLength = me.getMaxLength(),
            value = me.getValue();
        if (maxLength && value.length > maxLength) {
            me.setValue(value.slice(0, maxLength));
        }
    },
    doDestroy: function() {
        var me = this,
            triggers = me.getTriggers(),
            triggerGroups = me.triggerGroups,
            name, animation;
        animation = me.labelElement && me.labelElement.getActiveAnimation();
        if (animation) {
            animation.stop();
        }
        if (triggerGroups) {
            for (name in triggerGroups) {
                triggerGroups[name].destroy();
            }
            me.triggerGroups = null;
        }
        for (name in triggers) {
            triggers[name].destroy();
        }
        me.setTriggers(null);
        me.setInputMask(null);
        me.callParent();
    },
    onRender: function() {
        this.callParent();
        this.syncLabelPlaceholder();
    },
    getRefItems: function(deep) {
        var me = this,
            triggers = me.getTriggers(),
            items = [],
            triggerName, trigger;
        for (triggerName in triggers) {
            trigger = triggers[triggerName];
            items.push(trigger);
            if (deep && trigger.getRefItems) {
                items.push.apply(items, trigger.getRefItems(deep));
            }
        }
        return items;
    },
    privates: {
        focusedInputDelay: 300,
        forceInputChange: false,
        hasMask: false,
        lastKeyTime: 0,
        applyParseValidator: function(config) {
            return this.decodeValidator(config);
        },
        updateLabelInPlaceholder: function(inside) {
            var me = this,
                placeHolder = me.getPlaceholder() || '',
                anim = me._animPlaceholderLabel;
            if (me.getLabelAlign() !== 'placeholder' || !me.getLabel()) {
                me.clearWhenVisible('doPositionPlaceholder');
                me.setInputAttribute('placeholder', placeHolder);
                return;
            }
            me.whenVisible('doPositionPlaceholder', [
                inside,
                anim
            ]);
            me.el.toggleCls(Ext.baseCSSPrefix + 'label-inside', inside);
        },
        updateAnimateUnderline: function(value) {
            this.toggleCls(Ext.baseCSSPrefix + 'animate-underline', value);
        },
        canSetInputValue: function() {
            var me = this;
            return me.hasMask || me.forceInputChange || !me.hasFocus || Date.now() - me.lastKeyTime > me.focusedInputDelay;
        },
        doPositionPlaceholder: function(inside, doAnimate) {
            var me = this,
                labelElement = me.labelElement,
                anim, animation, info, insideInfo, outsideInfo;
            animation = labelElement.getActiveAnimation();
            if (animation) {
                animation.stop();
            }
            info = me.lastPlaceholderAnimInfo;
            if (!info) {
                me.lastPlaceholderAnimInfo = info = me.getPlaceholderAnimInfo();
            }
            insideInfo = info.inside;
            outsideInfo = info.outside;
            anim = {
                from: inside ? outsideInfo : insideInfo,
                to: inside ? insideInfo : outsideInfo,
                preserveEndState: true,
                duration: 250,
                easing: 'ease-out'
            };
            if (doAnimate) {
                labelElement.animate(anim);
            } else {
                labelElement.setStyle(anim.to);
            }
        },
        getPlaceholderLabel: function() {
            var me = this,
                label = me.getLabel();
            if (label && me.getRequired()) {
                label += ' ' + me.requiredIndicator;
            }
            return label;
        },
        getPlaceholderAnimInfo: function() {
            var me = this,
                element = me.element,
                labelElement = me.labelElement,
                inputElement = me.inputElement,
                labelOffsets = labelElement.getOffsetsTo(element),
                inputOffsets = inputElement.getOffsetsTo(element),
                labelLeftPadding = labelElement.getPadding('l'),
                inputLeftPadding = inputElement.getPadding('l'),
                labelTopPadding = labelElement.getPadding('t'),
                inputTopPadding = inputElement.getPadding('t'),
                translateX = inputOffsets[0] - labelOffsets[0] + (inputLeftPadding - labelLeftPadding),
                translateY = inputOffsets[1] - labelOffsets[1] + (inputTopPadding - labelTopPadding);
            return {
                inside: {
                    transform: {
                        translateX: translateX + 'px',
                        translateY: translateY + 'px'
                    },
                    'font-size': inputElement.getStyle('font-size')
                },
                outside: {
                    transform: {
                        translateX: '0px',
                        translateY: '0px'
                    },
                    'font-size': labelElement.getStyle('font-size')
                }
            };
        },
        handlePaste: function(e) {
            var me = this,
                inputMask = me.getInputMask();
            if (inputMask) {
                inputMask.onPaste(me, me.getValue(), e);
            }
            me.fireEvent('paste', me, e);
        },
        createTrigger: function(name, trigger) {
            if (!trigger.isTrigger) {
                if (trigger === true) {
                    trigger = {
                        type: name
                    };
                } else if (typeof trigger === 'string') {
                    trigger = {
                        type: trigger
                    };
                }
                trigger = Ext.apply({
                    name: name,
                    field: this
                }, trigger);
                trigger = trigger.xtype ? Ext.create(trigger) : Ext.Factory.trigger(trigger);
            }
            return trigger;
        },
        syncLabelPlaceholder: function(animate) {
            var me = this,
                inside;
            me._animPlaceholderLabel = animate;
            if (me.rendered) {
                if (me.hasValue()) {
                    inside = false;
                } else {
                    inside = !me.hasFocus || me.getDisabled() || me.getReadOnly();
                }
                me.setLabelInPlaceholder(inside);
            }
            me._animPlaceholderLabel = false;
        },
        hasValue: function() {
            return this.inputElement && this.inputElement.dom.value;
        },
        processRawValue: function(value) {
            var me = this,
                stripRe = me.stripCharsRe,
                mod, newValue;
            if (stripRe) {
                if (!stripRe.global) {
                    mod = 'g';
                    mod += (stripRe.ignoreCase) ? 'i' : '';
                    mod += (stripRe.multiline) ? 'm' : '';
                    stripRe = new RegExp(stripRe.source, mod);
                }
                newValue = value.replace(stripRe, '');
                if (newValue !== value) {
                    if (!me.transformRawValue.$nullFn) {
                        newValue = me.transformRawValue(newValue);
                    }
                    me.inputElement.dom.value = newValue;
                    value = newValue;
                }
            }
            return value;
        },
        syncTriggers: function() {
            var me = this,
                triggers = me.getTriggers(),
                beforeInputElement = me.beforeInputElement,
                afterInputElement = me.afterInputElement,
                triggerGroups = me.triggerGroups || (me.triggerGroups = {}),
                beforeTriggers = [],
                afterTriggers = [],
                triggersByGroup = {},
                TriggerBase = Ext.field.trigger['Base'],
                name, trigger, groupName, triggerGroup, i, ln;
            for (name in triggers) {
                trigger = triggers[name];
                groupName = trigger.getGroup();
                if (groupName) {
                    (triggersByGroup[groupName] || (triggersByGroup[groupName] = [])).push(trigger);
                } else if (trigger.getSide() === 'left') {
                    beforeTriggers.push(trigger);
                } else {
                    afterTriggers.push(trigger);
                }
            }
            for (groupName in triggersByGroup) {
                triggerGroup = triggerGroups[groupName];
                if (!triggerGroup) {
                    triggerGroup = triggers[groupName];
                    if (!triggerGroup) {
                        triggerGroup = new TriggerBase();
                    }
                    triggerGroups[groupName] = triggerGroup;
                }
                triggerGroup.setTriggers(TriggerBase.sort(triggersByGroup[groupName]));
                if (triggerGroup.getSide() === 'left') {
                    beforeTriggers.push(triggerGroup);
                } else {
                    afterTriggers.push(triggerGroup);
                }
            }
            TriggerBase.sort(beforeTriggers);
            TriggerBase.sort(afterTriggers);
            for (i = 0 , ln = beforeTriggers.length; i < ln; i++) {
                beforeInputElement.appendChild(beforeTriggers[i].element);
            }
            for (i = 0 , ln = afterTriggers.length; i < ln; i++) {
                afterInputElement.appendChild(afterTriggers[i].element);
            }
            for (groupName in triggerGroups) {
                if (!(groupName in triggersByGroup)) {
                    triggerGroup = triggerGroups[groupName];
                    triggerGroup.setTriggers(null);
                    triggerGroup.destroy();
                    delete triggerGroups[groupName];
                }
            }
        },
        syncEmptyState: function() {
            var me = this,
                triggers = me.getTriggers(),
                inputMask = me.getInputMask(),
                clearTrigger = triggers && triggers.clear,
                value = me.inputElement.dom.value,
                visible;
            me.toggleCls(me.emptyCls, !value);
            if (clearTrigger) {
                if (me.getClearable()) {
                    if (me.hasValue() && !me.getDisabled() && !me.getReadOnly()) {
                        visible = true;
                    }
                    if (inputMask) {
                        if (value === inputMask._mask) {
                            visible = false;
                        }
                    }
                }
                if (visible) {
                    clearTrigger.show();
                } else {
                    clearTrigger.hide();
                }
            }
        }
    },
    deprecated: {
        '6.5': {
            configs: {
                placeHolder: 'placeholder',
                clearIcon: 'clearable'
            },
            methods: {
                getPlaceHolder: 'getPlaceholder',
                setPlaceHolder: 'setPlaceholder'
            }
        }
    }
}, function() {
    if (Ext.os.is.Android) {
        window.addEventListener('resize', function() {
            var el = document.activeElement,
                tag = el && el.tagName,
                focusedField, focusedDom;
            if (tag === 'INPUT' || tag === 'TEXTAREA') {
                focusedField = Ext.Component.from(el);
                focusedDom = focusedField && focusedField.element && focusedField.element.dom;
                if (focusedDom) {
                    if (focusedDom.scrollIntoViewIfNeeded) {
                        focusedDom.scrollIntoViewIfNeeded();
                    } else {
                        focusedDom.scrollIntoView();
                    }
                }
            }
        });
    }
});

Ext.define('Ext.TitleBar', {
    extend: Ext.Container,
    xtype: 'titlebar',
    defaultBindProperty: 'title',
    isToolbar: true,
    classCls: Ext.baseCSSPrefix + 'titlebar',
    inheritUi: true,
    config: {
        cls: Ext.baseCSSPrefix + 'navigation-bar',
        title: null,
        titleAlign: 'center',
        defaultType: 'button',
        defaultButtonUI: null,
        minHeight: null,
        layout: {
            type: 'hbox',
            align: 'center'
        },
        items: [],
        maxButtonWidth: '40%'
    },
    autoSize: null,
    border: false,
    beforeInitialize: function() {
        this.applyItems = this.applyInitialItems;
    },
    initialize: function() {
        var me = this;
        me.callParent();
        delete me.applyItems;
        me.add(me.initialItems);
        delete me.initialItems;
        me.on({
            scope: me,
            painted: 'refreshTitlePosition',
            single: true
        });
    },
    applyInitialItems: function(items) {
        var me = this,
            titleAlign = me.getTitleAlign(),
            defaults = me.getDefaults() || {};
        me.initialItems = items;
        me.leftBox = me.add({
            xtype: 'container',
            style: 'position: relative',
            cls: Ext.baseCSSPrefix + 'titlebar-left',
            autoSize: null,
            layout: {
                type: 'hbox',
                align: 'center'
            },
            listeners: {
                resize: 'refreshTitlePosition',
                scope: me
            }
        });
        me.spacer = me.add({
            xtype: 'component',
            style: 'position: relative',
            cls: Ext.baseCSSPrefix + 'titlebar-center',
            flex: 1,
            listeners: {
                resize: 'refreshTitlePosition',
                scope: me
            }
        });
        me.rightBox = me.add({
            xtype: 'container',
            style: 'position: relative',
            cls: Ext.baseCSSPrefix + 'titlebar-right',
            autoSize: null,
            layout: {
                type: 'hbox',
                align: 'center'
            },
            listeners: {
                resize: 'refreshTitlePosition',
                scope: me
            }
        });
        switch (titleAlign) {
            case 'left':
                me.titleComponent = me.leftBox.add({
                    xtype: 'title',
                    cls: Ext.baseCSSPrefix + 'title-align-left',
                    hidden: defaults.hidden
                });
                me.refreshTitlePosition = Ext.emptyFn;
                break;
            case 'right':
                me.titleComponent = me.rightBox.add({
                    xtype: 'title',
                    cls: Ext.baseCSSPrefix + 'title-align-right',
                    hidden: defaults.hidden
                });
                me.refreshTitlePosition = Ext.emptyFn;
                break;
            default:
                me.titleComponent = me.add({
                    xtype: 'title',
                    hidden: defaults.hidden,
                    centered: true
                });
                break;
        }
        me.doAdd = me.doBoxAdd;
        me.remove = me.doBoxRemove;
        me.doInsert = me.doBoxInsert;
    },
    doBoxAdd: function(item) {
        var me = this,
            titleAlign = me.getTitleAlign();
        me.addDefaultButtonUI(item);
        if (item.config.align === 'right') {
            me.rightBox.add(item);
        } else if (me.titleComponent && titleAlign === 'left') {
            me.leftBox.insertBefore(item, me.titleComponent);
        } else {
            me.leftBox.add(item);
        }
    },
    doBoxRemove: function(item, destroy) {
        if (item.config.align === 'right') {
            this.rightBox.remove(item, destroy);
        } else {
            this.leftBox.remove(item, destroy);
        }
    },
    doBoxInsert: function(index, item) {
        var me = this;
        me.addDefaultButtonUI(item);
        if (item.config.align === 'right') {
            me.rightBox.insert(index, item);
        } else {
            me.leftBox.insert(index, item);
        }
    },
    addDefaultButtonUI: function(item) {
        var defaultButtonUI = this.getDefaultButtonUI();
        if (defaultButtonUI) {
            if (item.isSegmentedButton) {
                if (item.getDefaultUI() == null) {
                    item.setDefaultUI(defaultButtonUI);
                }
            } else if (item.isButton && (item.getUi() == null)) {
                item.setUi(defaultButtonUI);
            }
        }
    },
    calculateMaxButtonWidth: function() {
        var maxButtonWidth = this.getMaxButtonWidth();
        if (Ext.isString(maxButtonWidth)) {
            maxButtonWidth = parseInt(maxButtonWidth.replace('%', ''), 10);
        }
        maxButtonWidth = Math.round((this.element.getWidth() / 100) * maxButtonWidth);
        return maxButtonWidth;
    },
    refreshTitlePosition: function() {
        var titleElement, leftBox, leftButton, singleButton, leftBoxWidth, maxButtonWidth, spacerBox, titleBox, widthDiff, titleLeft, titleRight, halfWidthDiff, leftDiff, rightDiff;
        if (this.destroyed) {
            return;
        }
        titleElement = this.titleComponent.renderElement;
        titleElement.setWidth(null);
        titleElement.setLeft(null);
        leftBox = this.leftBox;
        leftButton = leftBox.down('button');
        singleButton = leftBox.getItems().getCount() === 1;
        if (leftButton && singleButton) {
            if (leftButton.getWidth() == null) {
                leftButton.renderElement.setWidth('auto');
            }
            leftBoxWidth = leftBox.renderElement.getWidth();
            maxButtonWidth = this.calculateMaxButtonWidth();
            if (leftBoxWidth > maxButtonWidth) {
                leftButton.renderElement.setWidth(maxButtonWidth);
            }
        }
        spacerBox = this.spacer.renderElement.getBox();
        if (Ext.browser.is.IE) {
            titleElement.setWidth(spacerBox.width);
        }
        titleBox = titleElement.getBox();
        widthDiff = titleBox.width - spacerBox.width;
        titleLeft = titleBox.left;
        titleRight = titleBox.right;
        if (widthDiff > 0) {
            halfWidthDiff = widthDiff / 2;
            titleLeft += halfWidthDiff;
            titleRight -= halfWidthDiff;
            titleElement.setWidth(spacerBox.width);
        }
        leftDiff = spacerBox.left - titleLeft;
        rightDiff = titleRight - spacerBox.right;
        if (leftDiff > 0) {
            titleElement.setLeft(leftDiff);
        } else if (rightDiff > 0) {
            titleElement.setLeft(-rightDiff);
        }
        titleElement.repaint();
    },
    updateTitle: function(newTitle) {
        this.getItems();
        this.titleComponent.setTitle(newTitle);
        if (this.isPainted()) {
            this.refreshTitlePosition();
        }
    }
});

Ext.define('Ext.dataview.Location', {
    isDataViewLocation: true,
    isLocation: true,
    child: null,
    event: null,
    item: null,
    record: null,
    recordIndex: -1,
    sourceElement: null,
    view: null,
    viewIndex: -1,
    constructor: function(view, source) {
        this.view = view;
        if (source != null) {
            this.attach(source);
        }
    },
    attach: function(source) {
        var me = this,
            view = me.view,
            store = view.store,
            record, child, sourceElement;
        if (me.source) {
            Ext.raise('DataView Locations cannot be modified');
        }
        if (source.isEvent) {
            me.event = source;
            sourceElement = source.target;
        }
        if (source.isElement || source.nodeType === 1) {
            sourceElement = source;
        }
        me.source = source;
        if (source.isWidget) {
            sourceElement = source.getFocusEl();
            source = source.element;
        }
        if (typeof source === 'number') {
            child = view.itemFromRecord(source);
            me.recordIndex = source;
            record = store && store.getAt(source);
        } else {
            if (source.isModel) {
                record = source;
            } else {
                record = view.mapToRecord(source);
            }
            child = view.mapToItem(source);
            me.recordIndex = store ? store.indexOf(record) : -1;
        }
        if (child && !sourceElement) {
            sourceElement = child.isWidget ? child.getFocusEl() : child;
        }
        me.child = child;
        me.record = record;
        if (record && child) {
            me.item = child;
        }
        if (child) {
            me.viewIndex = view.mapToViewIndex(child);
        }
        me.sourceElement = Ext.getDom(sourceElement);
    },
    clone: function() {
        var me = this,
            ret = new this.self(me.view);
        ret.event = me.event;
        ret.sourceElement = me.sourceElement;
        ret.item = me.item;
        ret.record = me.record;
        ret.recordIndex = me.recordIndex;
        ret.viewIndex = me.viewIndex;
        return ret;
    },
    equals: function(other) {
        return other && other.view === this.view && other.isDataViewLocation && other.sourceElement === this.sourceElement;
    },
    getFocusEl: function(as) {
        var item = this.get(),
            ret = null;
        if (item && item.isWidget) {
            item = item.element;
        }
        if (item) {
            ret = (as === 'dom' || as === true) ? Ext.getDom(item) : Ext.get(item);
        }
        return ret;
    },
    get: function() {
        return this.child;
    },
    isFirstDataItem: function() {
        return this.recordIndex === 0;
    },
    isFirstViewItem: function() {
        var view = this.view;
        if (view.infinite) {
            return view.previous(this.child == null);
        }
        return this.viewIndex === 0;
    },
    isLastDataItem: function() {
        return this.recordIndex === this.view.store.getCount() - 1;
    },
    isLastViewItem: function() {
        var view = this.view;
        if (view.infinite) {
            return view.next(this.child == null);
        }
        return this.viewIndex === view.innerItems.length - 1;
    },
    refresh: function() {
        var me = this,
            view = me.view,
            item = me.child,
            newSource = view.mapToItem(me.record) || (view.items.contains(item) ? item : view.mapToItem(Math.min(me.viewIndex, view.dataItems.length - 1)));
        return new this.self(view, newSource);
    },
    isFirst: function() {
        return this.view.isFirstItem(this.child);
    },
    isLast: function() {
        return this.view.isLastItem(this.child);
    },
    next: function(options) {
        var me = this,
            candidate = me.nextItem(options),
            item = candidate && candidate.get();
        while (candidate && (!item || !item.el.isFocusable())) {
            if (candidate.equals(me)) {
                return me;
            }
            candidate = candidate.nextItem(options);
            item = candidate && candidate.get();
        }
        return candidate || me;
    },
    previous: function(options) {
        var me = this,
            candidate = me.previousItem(options),
            item = candidate && candidate.get();
        while (candidate && (!item || !item.el.isFocusable())) {
            if (candidate.equals(me)) {
                return me;
            }
            candidate = candidate.previousItem(options);
            item = candidate && candidate.get();
        }
        return candidate || me;
    },
    nextItem: function(options) {
        var view = this.view,
            item = this.child,
            wrap = (typeof options === 'boolean') ? options : !!(options && options.wrap),
            nextItem;
        if (view.isLastItem(item)) {
            if (wrap) {
                nextItem = view.getFirstItem();
            } else {
                return null;
            }
        } else {
            nextItem = view.nextItem(item);
        }
        return new this.self(view, nextItem);
    },
    previousItem: function(options) {
        var view = this.view,
            item = this.child,
            wrap = (typeof options === 'boolean') ? options : !!(options && options.wrap),
            prevItem;
        if (view.isFirstItem(item)) {
            if (wrap) {
                prevItem = view.getLastItem();
            } else {
                return null;
            }
        } else {
            prevItem = view.previousItem(item);
        }
        return new this.self(view, prevItem);
    },
    privates: {
        as: function(item, as) {
            if (item) {
                if (item.isWidget) {
                    if (as === 'cmp') {
                        return item;
                    }
                    item = item.el;
                }
                if (as === 'dom') {
                    item = item.dom || item;
                } else if (as === 'el') {
                    if (!item.dom) {
                        item = Ext.get(item);
                    }
                } else {
                    Ext.raise('Expected "as" to be "dom" or "el"');
                }
            }
            return item || null;
        }
    }
});

Ext.define('Ext.dataview.NavigationModel', {
    extend: Ext.Evented,
    alias: 'navmodel.dataview',
    mixins: [
        Ext.mixin.Factoryable,
        Ext.mixin.Bufferable
    ],
    factoryConfig: {
        type: 'navmodel',
        defaultType: 'dataview',
        instanceProp: 'isNavigationModel'
    },
    isNavigationModel: true,
    config: {
        view: null,
        disabled: false
    },
    bufferableMethods: {
        handleChildTrigger: 1
    },
    locationClass: 'Ext.dataview.Location',
    setLocation: function(location, options) {
        var me = this,
            view = me.getView(),
            oldLocation = me.location,
            animation = options && options.animation,
            scroller, child, record, itemContainer, childFloatStyle, locationView;
        if (location == null) {
            return me.clearLocation();
        }
        if (!location.isDataViewLocation) {
            location = this.createLocation(location);
        }
        locationView = location.view;
        if (!location.equals(oldLocation)) {
            record = location.record;
            child = location.child;
            if (record && !child) {
                return locationView.ensureVisible(record, {
                    animation: animation
                }).then(function() {
                    if (!me.destroyed) {
                        locationView.getNavigationModel().setLocation({
                            record: record,
                            column: location.column
                        }, options);
                    }
                });
            }
            if (child && me.floatingItems == null) {
                child = child.isComponent ? child.el : Ext.fly(child);
                itemContainer = child.up();
                childFloatStyle = child.getStyleValue('float');
                me.floatingItems = (view.getInline && view.getInline()) || child.isStyle('display', 'inline-block') || childFloatStyle === 'left' || childFloatStyle === 'right' || (itemContainer.isStyle('display', 'flex') && itemContainer.isStyle('flex-direction', 'row'));
            }
            scroller = locationView.getScrollable();
            if (scroller) {
                scroller.ensureVisible(location.sourceElement, {
                    animation: options && options.animation
                });
            }
            me.handleLocationChange(location, options);
            if (!me.destroyed) {
                me.doFocus();
            }
        }
    },
    clearLocation: function() {
        var me = this,
            targetElement;
        if (me.location) {
            me.lastLocation = me.location;
            targetElement = me.location.getFocusEl();
            if (targetElement && !targetElement.destroyed) {
                Ext.fly(targetElement).removeCls(me.focusedCls);
                me.previousLocation = me.location;
            } else {
                me.previousLocation = null;
            }
            me.location = null;
        }
    },
    getLocation: function() {
        return this.location;
    },
    getPreviousLocation: function() {
        var result = this.previousLocation;
        if (result && (!result.sourceElement || !result.sourceElement.destroyed)) {
            result.refresh();
        }
        return result;
    },
    disable: function() {
        this.setDisabled(true);
    },
    enable: function() {
        this.setDisabled(false);
    },
    privates: {
        createLocation: function(source, options) {
            return Ext.create(this.locationClass, this.getView(), source, options);
        },
        getKeyNavCfg: function(view) {
            var me = this;
            return {
                target: view.getFocusEl(),
                processEvent: me.processViewEvent,
                processEventScope: me,
                eventName: 'keydown',
                defaultEventAction: 'stopEvent',
                esc: me.onKeyEsc,
                f2: me.onKeyF2,
                up: me.onKeyUp,
                down: me.onKeyDown,
                right: me.onKeyRight,
                left: me.onKeyLeft,
                pageDown: me.onKeyPageDown,
                pageUp: me.onKeyPageUp,
                home: me.onKeyHome,
                end: me.onKeyEnd,
                space: me.onKeySpace,
                enter: me.onKeyEnter,
                tab: me.onKeyTab,
                A: {
                    ctrl: true,
                    handler: me.onSelectAllKeyPress
                },
                scope: me
            };
        },
        updateView: function(view) {
            var me = this,
                keyNavCfg = me.getKeyNavCfg(view);
            me.focusedCls = view.focusedCls;
            if (keyNavCfg) {
                me.keyNav = new Ext.util.KeyNav(keyNavCfg);
            }
            me.viewListeners = view.on(me.getViewListeners(view));
        },
        getViewListeners: function(view) {
            var result = {
                    scope: this
                };
            result[view.getTriggerEvent()] = 'onChildTrigger';
            return result;
        },
        processViewEvent: function(e) {
            var location = this.getLocation(),
                component;
            if (location && e.keyCode) {
                component = Ext.fly(e.target).component;
                e.navigationMode = component && component.parent === this.getView();
                e.setCurrentTarget(location.sourceElement);
                if (!Ext.fly(e.target).isInputField()) {
                    return e;
                }
            }
        },
        doFocus: function(location) {
            location = location || this.location;
            if (location && location.getFocusEl()) {
                location.getFocusEl().focus();
            }
        },
        onFocusMove: function(e) {
            var location = this.createLocation(e);
            if (!location.equals(this.location)) {
                this.handleLocationChange(location, {
                    event: e,
                    navigate: false
                });
            }
        },
        handleLocationChange: function(location, options) {
            var me = this,
                oldLocation = me.location,
                view = me.getView(),
                target, item;
            me.previousLocation = oldLocation;
            if (oldLocation) {
                me.lastLocation = oldLocation;
                target = oldLocation.getFocusEl();
                if (target && !target.destroyed) {
                    Ext.fly(target).removeCls(me.focusedCls);
                }
            }
            me.location = location;
            target = location && location.getFocusEl('dom');
            if (target) {
                item = location.get();
                if (item) {
                    if (item.isWidget) {
                        item = item.el;
                    } else {
                        item = Ext.get(item);
                    }
                    if (item && target === item.dom) {
                        item.addCls(me.focusedCls);
                    }
                    if (options && (options.event || options.select) && options.navigate !== false) {
                        me.onNavigate(options.event);
                    }
                }
            }
            if (!view.destroyed) {
                view.fireEvent('navigate', view, location, oldLocation);
            }
        },
        onKeyUp: function(e) {
            var me = this;
            e.preventDefault();
            if (me.location) {
                if (me.floatingItems) {
                    me.moveUp(e);
                } else {
                    me.movePrevious({
                        event: e
                    });
                }
            } else {
                me.setLocation(0);
            }
        },
        onKeyDown: function(e) {
            var me = this;
            e.preventDefault();
            if (me.location) {
                if (me.floatingItems) {
                    me.moveDown(e);
                } else {
                    me.moveNext({
                        event: e
                    });
                }
            } else {
                me.setLocation(0);
            }
        },
        onKeyLeft: function(e) {
            e.preventDefault();
            this.movePrevious({
                event: e
            });
        },
        onKeyRight: function(e) {
            e.preventDefault();
            this.moveNext({
                event: e
            });
        },
        onKeyF2: function(e) {
            return false;
        },
        onKeyEsc: function(e) {
            return false;
        },
        onKeyTab: function(e) {
            return !this.location.actionable;
        },
        onKeyPageDown: function(e) {
            var me = this,
                candidate, view, y;
            e.preventDefault();
            if (!me.location.actionable && !me.floatingItems) {
                view = me.getView();
                y = (view.infinite ? view.getItemTop(me.location.child) : me.location.child.el.dom.offsetTop) + view.el.getClientRegion().height;
                candidate = me.createLocation(view.getItemFromPoint(0, y));
                if (!(candidate.child && candidate.child.el.isFocusable())) {
                    candidate = candidate.previous();
                }
                me.setLocation(candidate, {
                    event: e
                });
            }
        },
        onKeyPageUp: function(e) {
            var me = this,
                candidate, view, y;
            e.preventDefault();
            if (!me.location.actionable && !me.floatingItems) {
                view = me.getView();
                y = (view.infinite ? view.getItemTop(me.location.child) : me.location.child.el.dom.offsetTop) - view.el.getClientRegion().height;
                candidate = me.createLocation(view.getItemFromPoint(0, y));
                if (!(candidate.child && candidate.child.el.isFocusable())) {
                    candidate = candidate.next();
                }
                me.setLocation(candidate, {
                    event: e
                });
            }
        },
        onKeyHome: function(e) {
            this.setLocation(0, {
                event: e
            });
        },
        onKeyEnd: function(e) {
            this.setLocation(this.getView().getStore().last(), {
                event: e
            });
        },
        onKeySpace: function(e) {
            this.onNavigate(e);
        },
        onKeyEnter: function(e) {
            e.stopEvent();
            this.getView()._onChildTap(e);
        },
        onSelectAllKeyPress: function(e) {
            var view = this.getView(),
                selModel = view.getSelectable();
            if (selModel && view.getStore().getCount()) {
                selModel[selModel.allSelected ? 'deselectAll' : 'selectAll']();
                e.preventDefault();
                return false;
            }
        },
        moveUp: function(e) {
            var view = this.getView(),
                location = this.location,
                el = this.location.sourceElement,
                topCentre = Ext.fly(el).getAnchorXY('t'),
                item;
            topCentre[1] -= (Ext.fly(el).getMargin('tb') + 10);
            item = view.getItemFromPagePoint(topCentre[0], topCentre[1], true);
            if (!item || !item.isFocusable()) {
                item = location.isFirst() ? view.getLastItem() : view.getFirstItem();
            }
            if (item) {
                this.setLocation(item, {
                    event: e
                });
            }
        },
        moveDown: function(e) {
            var view = this.getView(),
                location = this.location,
                el = location.sourceElement,
                bottomCentre = Ext.fly(el).getAnchorXY('b'),
                item;
            bottomCentre[1] += Ext.fly(el).getMargin('tb') + 10;
            item = view.getItemFromPagePoint(bottomCentre[0], bottomCentre[1]);
            if (!item || !item.isFocusable()) {
                item = location.isLast() ? view.getFirstItem() : view.getLastItem();
            }
            if (item) {
                this.setLocation(item, {
                    event: e
                });
            }
        },
        moveNext: function(options) {
            var location = this.getLocation();
            if (location) {
                location = location.next(options);
                if (location) {
                    this.setLocation(location, options);
                }
            }
        },
        movePrevious: function(options) {
            var location = this.getLocation();
            if (location) {
                location = location.previous(options);
                if (location) {
                    this.setLocation(location, options);
                }
            }
        },
        onChildTrigger: function(view, location) {
            var e = location.event,
                isFocusingEvent = (e.type === ((e.pointerType === 'touch') ? 'tap' : 'touchstart'));
            if (isFocusingEvent) {
                this.handleChildTrigger(view, location);
            } else {
                this.doHandleChildTrigger(view, location);
            }
        },
        doHandleChildTrigger: function(view, location) {
            var myLocation = this.location,
                event = location.event,
                compareMethod = location.isGridLocation ? 'equalCell' : 'equals';
            if (myLocation && myLocation[compareMethod](location)) {
                this.onNavigate(event);
            } else {
                this.setLocation(location, {
                    event: event
                });
            }
        },
        onNavigate: function(event) {
            var me = this,
                location = me.location;
            if (!event) {
                event = new Ext.event.Event({
                    target: location.sourceElement
                });
            }
            Ext.apply(event, {
                navigationModel: me,
                from: me.previousLocation,
                to: location
            });
            me.getView().onNavigate(event);
        },
        updateDisabled: function(disabled) {
            if (this.keyNav) {
                if (disabled) {
                    this.keyNav.disable();
                } else {
                    this.keyNav.enable();
                }
            }
        }
    }
});

Ext.define('Ext.dataview.selection.Selection', {
    mixins: [
        Ext.mixin.Factoryable
    ],
    factoryConfig: {
        type: 'selection',
        defaultType: 'records',
        instanceProp: 'isSelection'
    },
    isSelection: true,
    config: {
        selectionModel: null
    },
    constructor: function(config) {
        if (config.isDataView) {
            config = {
                selectionModel: config.getSelectionModel()
            };
        }
        this.initConfig(config);
        if (!this.getSelectionModel()) {
            Ext.raise('Selection must be configured with a SelectionModel');
        }
    },
    destroy: function() {
        this.clear();
        this.callParent();
    },
    privates: {
        applySelectionModel: function(selectionModel) {
            var view = selectionModel.getView();
            this.view = view.isGrid ? view.ownerGrid : view;
            return selectionModel;
        }
    }
});

Ext.define('Ext.dataview.selection.Rows', {
    extend: Ext.dataview.selection.Selection,
    alias: 'selection.rows',
    isRows: true,
    config: {
        selected: true
    },
    clone: function() {
        return new this.self({
            selectionModel: this.getSelectionModel(),
            selected: new Ext.util.Spans().unstash(this.getSelected().stash())
        });
    },
    add: function(range, keepExisting, suppressEvent) {
        var me = this,
            view = me.view,
            rowIdx, tmp, record;
        if (range.length === 1) {
            range = range[0];
        }
        if (range.isEntity) {
            record = range;
            range = view.mapToRecordIndex(range);
        }
        if (typeof range === 'number') {
            range = [
                range,
                range + 1
            ];
        }
        if (range.length !== 2 || typeof range[0] !== 'number' || typeof range[1] !== 'number') {
            Ext.raise('add must be called with a [start, end] row index *EXCLUSIVE* range');
        }
        if (range[0] > range[1]) {
            tmp = range[1];
            range[1] = range[0];
            range[0] = tmp;
        }
        me.lastSelected = range[1];
        if (!keepExisting) {
            me.clear();
        }
        me.getSelected().add(range);
        for (rowIdx = range[0]; rowIdx < range[1]; rowIdx++) {
            view.onItemSelect(rowIdx);
        }
        me.manageSelection(record);
        if (!suppressEvent) {
            me.getSelectionModel().fireSelectionChange();
        }
    },
    remove: function(range, suppressEvent) {
        var me = this,
            selModel = me.getSelectionModel(),
            view = me.view,
            rowIdx;
        if (!selModel.getDeselectable() && me.getCount() === 1) {
            return;
        }
        if (range.length === 1) {
            range = range[0];
        }
        if (range.isEntity) {
            range = view.mapToRecordIndex(range);
        }
        if (typeof range === 'number') {
            range = [
                range,
                range + 1
            ];
        }
        if (!range.length === 2 && typeof range[0] === 'number' && typeof range[1] === 'number') {
            Ext.raise('remove must be called with a [start, end] record *EXCLUSIVE* range');
        }
        if (range[0] > range[1]) {
            Ext.raise('Range must be [startIndex, endIndex] (exclusive end)');
        }
        me.getSelected().remove(range);
        for (rowIdx = range[0]; rowIdx < range[1]; rowIdx++) {
            view.onItemDeselect(rowIdx);
        }
        if (!suppressEvent) {
            selModel.fireSelectionChange();
        }
    },
    isSelected: function(record) {
        var me = this,
            ranges = me.getSelected().spans,
            len = ranges.length,
            recIndex, range, i;
        recIndex = record.isEntity ? me.view.getStore().indexOf(record) : record;
        for (i = 0; i < len; i++) {
            range = ranges[i];
            if (recIndex >= range[0] && recIndex < range[1]) {
                return true;
            }
        }
        return false;
    },
    getCount: function() {
        return this.getSelected().getCount();
    },
    selectAll: function() {
        var view = this.view,
            items = view.dataItems,
            len = items.length,
            i;
        for (i = 0; i < len; i++) {
            view.onItemSelect(i);
        }
        this.getSelected().add(0, view.store.getTotalCount() || view.store.getCount());
        this.getSelectionModel().fireSelectionChange();
    },
    getFirstRowIndex: function() {
        var ranges = this.getSelected().spans;
        return ranges.length ? this.getSelected().spans[0][0] : 0;
    },
    getLastRowIndex: function() {
        var ranges = this.getSelected().spans;
        return ranges.length ? ranges[ranges.length - 1][1] - 1 : 0;
    },
    eachRow: function(fn, scope) {
        var me = this,
            ranges = me.getSelected().spans,
            len = ranges && ranges.length,
            result, range, i, j;
        for (i = 0; i < len; i++) {
            range = ranges[i];
            for (j = range[0]; result !== false && j < range[1]; j++) {
                result = fn.call(this || scope, j);
            }
        }
    },
    eachColumn: function(fn, scope) {
        var columns = this.view.getHeaderContainer().getVisibleColumns(),
            len = columns.length,
            i;
        if (this.getCount()) {
            for (i = 0; i < len; i++) {
                if (fn.call(this || scope, columns[i], i) === false) {
                    return;
                }
            }
        }
    },
    eachCell: function(fn, scope) {
        var me = this,
            selection = me.getSelected(),
            view = me.view,
            columns = view.ownerGrid.getVisibleColumnManager().getColumns(),
            range = me.dragRange,
            colCount, i, j, location, recCount,
            abort = false;
        if (columns) {
            colCount = columns.length;
            location = new Ext.grid.Location(view);
            if (selection) {
                me.eachRow(function(recordIndex) {
                    location.setItem(recordIndex);
                    for (i = 0; i < colCount; i++) {
                        location.setColumn(columns[i]);
                        if (fn.call(scope || me, location, location.columnIndex, location.recordIndex) === false) {
                            abort = true;
                            return false;
                        }
                    }
                });
            }
            if (!abort && range != null) {
                me.view.getStore().getRange(range[0], range[1], {
                    forRender: false,
                    callback: function(records) {
                        recCount = records.length;
                        for (i = 0; !abort && i < recCount; i++) {
                            location.setItem(records[i]);
                            for (j = 0; !abort && j < colCount; j++) {
                                location.setColumn(columns[j]);
                                if (fn.call(scope || me, location, location.columnIndex, location.recordIndex) === false) {
                                    abort = true;
                                }
                            }
                        }
                    }
                });
            }
        }
    },
    privates: {
        applySelected: function(spans) {
            if (!spans.isSpans) {
                spans = new Ext.util.Spans();
            }
            return spans;
        },
        compareRanges: function(lhs, rhs) {
            return lhs[0] - rhs[0];
        },
        clear: function(suppressEvent) {
            var me = this,
                selModel = me.getSelectionModel(),
                view = me.view,
                items = view.dataItems,
                len = items.length,
                indexTop = view.renderInfo.indexTop,
                i;
            for (i = 0; i < len; i++) {
                view.onItemDeselect(i + indexTop);
            }
            me.getSelected().clear();
            if (!selModel.getDeselectable() && me.lastSelected) {
                me.add(me.lastSelected, true, true);
            }
            me.manageSelection(null);
            if (!suppressEvent) {
                selModel.fireSelectionChange();
            }
        },
        addRecordRange: function(start, end) {
            return this.add([
                start,
                end + 1
            ], true);
        },
        removeRecordRange: function(start, end) {
            return this.remove([
                start,
                end + 1
            ]);
        },
        isAllSelected: function() {
            var store = this.view.store;
            return this.getCount() === (store.getTotalCount() || store.getCount());
        },
        setRangeStart: function(start) {
            if (start == null) {
                this.dragRange = null;
            } else {
                this.dragRange = [
                    start,
                    start
                ];
                this.view.onItemSelect(start, true);
            }
        },
        setRangeEnd: function(end) {
            var me = this,
                dragRange = me.dragRange || (me.dragRange = [
                    0,
                    end
                ]),
                oldEnd = dragRange[1],
                start = dragRange[0],
                view = me.view,
                renderInfo = view.renderInfo,
                tmp = dragRange[1] = end,
                removeRange = [],
                addRange = false,
                rowIdx, limit;
            if (start > end) {
                end = start;
                start = tmp;
            }
            rowIdx = Math.max(Math.min(dragRange[0], start, oldEnd, end), renderInfo.indexTop);
            limit = Math.min(Math.max(dragRange[1], start, oldEnd, end), renderInfo.indexBottom - 1);
            for (; rowIdx <= limit; rowIdx++) {
                if (rowIdx < start || rowIdx > end) {
                    view.onItemDeselect(rowIdx);
                    removeRange[removeRange.length ? 1 : 0] = rowIdx;
                } else {
                    view.onItemSelect(rowIdx, true);
                    addRange = true;
                }
            }
            if (addRange) {
                me.addRange(true);
            }
            if (removeRange.length) {
                me.removeRecordRange(removeRange[0], removeRange[1]);
            }
            me.lastSelectedIndex = end;
        },
        addRange: function(keep) {
            var range = this.dragRange;
            if (range) {
                this.addRecordRange(range[0], range[1]);
                if (!keep) {
                    this.dragRange = null;
                }
            }
        },
        extendRange: function(extensionVector) {
            this.addRecordRange(extensionVector.start, extensionVector.end);
        },
        reduceRange: function(extensionVector) {
            this.removeRecordRange(extensionVector.start, extensionVector.end);
        },
        getRange: function() {
            var range = this.dragRange;
            if (range == null) {
                return [
                    0,
                    -1
                ];
            }
            if (range[0] <= range[1]) {
                return range;
            }
            return [
                range[1],
                range[0]
            ];
        },
        getRangeSize: function() {
            var range = this.getRange();
            return range[1] - range[0] + 1;
        },
        onSelectionFinish: function() {
            var me = this,
                range = me.getContiguousSelection();
            if (range) {
                me.getSelectionModel().onSelectionFinish(me, new Ext.grid.Location(me.view, {
                    record: range[0],
                    column: 0
                }), new Ext.grid.Location(me.view, {
                    record: range[1],
                    column: me.view.getHeaderContainer().getVisibleColumns().length - 1
                }));
            } else {
                me.getSelectionModel().onSelectionFinish(me);
            }
        },
        getContiguousSelection: function() {
            var selected = this.getSelected(),
                store = this.view.store,
                spans = selected.spans;
            if (spans === 1 && store.getAt(spans[0][0]) && store.getAt(spans[0][1])) {
                return selected.spans[0];
            }
        },
        manageSelection: function(record) {
            var me = this,
                view = me.view,
                store = view.getStore(),
                selModel = me.getSelectionModel(),
                selected;
            if (!store.isVirtualStore || selModel.getMode() !== 'single') {
                return;
            }
            selected = selModel.getSelected();
            if (selected.length) {
                me.adjustPageLock(store, selected.getAt(0), -1);
            }
            if (record) {
                selected.splice.apply(selected, [
                    0,
                    0,
                    record
                ]);
                me.adjustPageLock(store, record, 1);
            } else {
                selected.remove(selected.getAt(0));
            }
        },
        adjustPageLock: function(store, record, delta) {
            var page;
            if (!store.isVirtualStore || !record) {
                return;
            }
            page = store.pageMap.getPageOf(store.indexOf(record));
            if (page) {
                page.adjustLock('active', delta);
            }
        }
    }
});

Ext.define('Ext.dataview.selection.Records', {
    extend: Ext.dataview.selection.Rows,
    alias: 'selection.records',
    isRecords: true,
    config: {
        selected: null
    },
    constructor: function(config) {
        this.callParent([
            config
        ]);
        var selected = this.getSelected();
        if (!(selected && selected.isCollection)) {
            Ext.raise('Ext.dataview.selection.Records must be given a selected Collection');
        }
    },
    clone: function() {
        return new this.self({
            selectionModel: this.getSelectionModel(),
            selected: this.getSelected()
        });
    },
    addRowRange: function(start, end, keepExisting, suppressEvent) {
        if (typeof start !== 'number' || typeof end !== 'number') {
            Ext.raise('addRange must be called with a [start, end] row index *EXCLUSIVE* range');
        }
        if (start > end) {
            var tmp = end;
            end = start;
            start = tmp;
        }
        this.add(this.getSelectionModel().getStore().getRange(start, end - 1), keepExisting, suppressEvent);
    },
    removeRowRange: function(start, end, suppressEvent) {
        if (typeof start !== 'number' || typeof end !== 'number') {
            Ext.raise('addRange must be called with a [start, end] row index *EXCLUSIVE* range');
        }
        if (start > end) {
            var tmp = end;
            end = start;
            start = tmp;
        }
        this.remove(this.getSelectionModel().getStore().getRange(start, end - 1), suppressEvent);
    },
    add: function(records, keepExisting, suppressEvent) {
        records = Ext.Array.from(records);
        for (var i = 0,
            ln = records.length; i < ln; i++) {
            if (!records[i].isEntity) {
                Ext.raise('add must be called with records or an array of records');
            }
        }
        var me = this,
            selected = me.getSelected(),
            selectionCount = selected.getCount(),
            args = [
                keepExisting ? selectionCount : 0,
                keepExisting ? 0 : selectionCount,
                records
            ];
        selected.suppressEvent = suppressEvent;
        selected.splice.apply(selected, args);
        selected.suppressEvent = false;
    },
    remove: function(records, suppressEvent) {
        records = Ext.Array.from(records);
        for (var i = 0,
            ln = records.length; i < ln; i++) {
            if (!records[i].isEntity) {
                Ext.raise('add must be called with records or an array of records');
            }
        }
        var selected = this.getSelected();
        if (!this.getSelectionModel().getDeselectable() && selected.getCount() === 1) {
            Ext.Array.remove(records, selected.first());
        }
        if (records.length) {
            selected.suppressEvent = suppressEvent;
            selected.remove(records);
            selected.suppressEvent = false;
        }
    },
    isSelected: function(record) {
        if (!record || !record.isModel) {
            return false;
        }
        return !!this.getSelected().byInternalId.get(record.internalId);
    },
    getRecords: function() {
        return this.getSelected().getRange();
    },
    selectAll: function(suppressEvent) {
        var selected = this.getSelected();
        selected.suppressEvent = suppressEvent;
        selected.add(this.getSelectionModel().getStore().getRange());
        selected.suppressEvent = false;
    },
    getFirstRowIndex: function() {
        return this.getCount() ? this.view.getStore().indexOf(this.getSelected().first()) : 0;
    },
    getLastRowIndex: function() {
        return this.getCount() ? this.view.getStore().indexOf(this.getSelected().last()) : -1;
    },
    eachRow: function(fn, scope) {
        var selectedRecords = this.getSelected();
        if (selectedRecords) {
            selectedRecords.each(fn, scope || this);
        }
    },
    eachColumn: function(fn, scope) {
        var columns = this.view.getHeaderContainer().getVisibleColumns(),
            len = columns.length,
            i;
        if (this.getSelected().getCount()) {
            for (i = 0; i < len; i++) {
                if (fn.call(this || scope, columns[i], i) === false) {
                    return;
                }
            }
        }
    },
    eachCell: function(fn, scope) {
        var me = this,
            selection = me.getSelected(),
            view = me.view,
            columns = view.getHeaderContainer().getVisibleColumns(),
            colCount, i, baseLocation, location;
        if (columns) {
            colCount = columns.length;
            baseLocation = new Ext.grid.Location(view);
            if (selection) {
                selection.each(function(record) {
                    location = baseLocation.clone({
                        record: record
                    });
                    for (i = 0; i < colCount; i++) {
                        location = location.cloneForColumn(columns[i]);
                        if (fn.call(scope || me, location, location.columnIndex, location.recordIndex) === false) {
                            return false;
                        }
                    }
                });
            }
        }
    },
    beginUpdate: function() {
        this.getSelected().beginUpdate();
    },
    endUpdate: function() {
        this.getSelected().endUpdate();
    },
    privates: {
        clear: function(suppressEvent) {
            var selected = this.getSelected(),
                spliceArgs;
            if (selected) {
                spliceArgs = [
                    0,
                    selected.getCount()
                ];
                if (!this.getSelectionModel().getDeselectable()) {
                    spliceArgs[2] = selected.last();
                }
                selected.suppressEvent = suppressEvent;
                selected.splice.apply(selected, spliceArgs);
                selected.suppressEvent = false;
            }
        },
        addRecordRange: function(start, end) {
            var me = this,
                view = me.view,
                store = view.getStore(),
                tmp = end,
                range;
            if (start && start.isGridLocation) {
                start = start.recordIndex;
            }
            if (end && end.isGridLocation) {
                end = tmp = end.recordIndex;
            }
            if (start > end) {
                end = start;
                start = tmp;
            }
            range = store.getRange(start, end || start);
            me.getSelected().add(range);
        },
        removeRecordRange: function(start, end) {
            var me = this,
                view = me.view,
                store = view.getStore(),
                tmp = end,
                range;
            if (start && start.isGridLocation) {
                start = start.recordIndex;
            }
            if (end && end.isGridLocation) {
                end = tmp = end.recordIndex;
                tmp = end;
            }
            if (start > end) {
                end = start;
                start = tmp;
            }
            range = store.getRange(start, end || start);
            this.getSelected().remove(range);
        },
        onSelectionFinish: function() {
            var me = this,
                range = me.getContiguousSelection();
            if (range) {
                me.getSelectionModel().onSelectionFinish(me, new Ext.grid.Location(me.view, {
                    record: range[0],
                    column: 0
                }), new Ext.grid.Location(me.view, {
                    record: range[1],
                    column: me.view.getHeaderContainer().getVisibleColumns().length - 1
                }));
            } else {
                me.getSelectionModel().onSelectionFinish(me);
            }
        },
        getContiguousSelection: function() {
            var store = this.view.getStore(),
                selection, len, i;
            selection = Ext.Array.sort(this.getSelected().getRange(), function(r1, r2) {
                return store.indexOf(r1) - store.indexOf(r2);
            });
            len = selection.length;
            if (len) {
                if (len === 1 && store.indexOf(selection[0]) === -1) {
                    return false;
                }
                for (i = 1; i < len; i++) {
                    if (store.indexOf(selection[i]) !== store.indexOf(selection[i - 1]) + 1) {
                        return false;
                    }
                }
                return [
                    store.indexOf(selection[0]),
                    store.indexOf(selection[len - 1])
                ];
            }
        },
        applySelected: function(selected) {
            if (!selected) {
                Ext.raise('Must pass the selected Collection to the Records Selection');
            }
            return selected;
        },
        refresh: function() {
            var me = this,
                view = me.view,
                selModel = me.getSelectionModel(),
                selected = me.getSelected(),
                lastSelected = selModel.getLastSelected(),
                lastSelectedIdx;
            Ext.dataview.selection.Model.refreshCollection(selected, selModel.getStore().getData(), selModel.ignoredFilters, view.beforeSelectionRefresh && view.beforeSelectionRefresh.bind(view));
            lastSelectedIdx = selected.indexOf(lastSelected);
            if (lastSelectedIdx === -1) {
                selModel.setLastSelected(selected.last());
            } else {
                selModel.setLastSelected(selected.getAt(lastSelectedIdx));
            }
        }
    }
});

Ext.define('Ext.dataview.selection.Model', {
    extend: Ext.Evented,
    alias: 'selmodel.dataview',
    mixins: [
        Ext.mixin.Factoryable
    ],
    factoryConfig: {
        type: 'selmodel',
        defaultType: 'dataview',
        aliasPrefix: 'selmodel.'
    },
    isSelectionModel: true,
    config: {
        view: null,
        store: null,
        disabled: null,
        mode: 'single',
        deselectable: true,
        toggleOnClick: true,
        lastSelected: null,
        selected: true,
        selectedRecord: undefined,
        selection: {
            type: 'records'
        }
    },
    modes: {
        single: true,
        simple: true,
        multi: true
    },
    onNavigate: function(e) {
        if (!this.getDisabled()) {
            this.selectWithEvent(e.to.record, e);
        }
    },
    getSelectedRecords: function() {
        var selection = this.getSelection();
        return selection && selection.isRecords ? selection.getRecords() : Ext.emptyArray;
    },
    getStoreListeners: function() {
        return {
            add: 'onSelectionStoreAdd',
            remove: 'onSelectionStoreRemove',
            update: 'onSelectionStoreUpdate',
            clear: {
                fn: 'onSelectionStoreClear',
                priority: 1000
            },
            load: 'onSelectionStoreLoad',
            refresh: 'refreshSelection',
            idchanged: 'onIdChanged'
        };
    },
    applySelected: function(selected, oldSelected) {
        var me = this,
            store = me.getStore(),
            collectionConfig = {
                rootProperty: 'data',
                extraKeys: {
                    byInternalId: {
                        rootProperty: false,
                        property: 'internalId'
                    }
                },
                sorters: [
                    function(r1, r2) {
                        return store.indexOf(r1) - store.indexOf(r2);
                    }
                ],
                autoSort: false
            };
        if (oldSelected) {
            oldSelected.removeObserver(me);
            if (me.destroySelected) {
                oldSelected.destroy();
                me.destroySelected = false;
            }
        }
        if (selected && selected.isCollection) {
            me.destroySelected = false;
            selected.setConfig(collectionConfig);
        } else {
            me.destroySelected = true;
            selected = new Ext.util.Collection(Ext.apply(collectionConfig, selected));
        }
        me.observerPriority = 1000;
        selected.addObserver(me);
        return selected;
    },
    updateSelected: function(selected) {
        this.setSelectedRecord(selected.last() || null);
    },
    applyMode: function(mode) {
        var view = this.getView(),
            el = view.getRenderTarget();
        mode = mode ? mode.toLowerCase() : 'single';
        el.toggleCls(view.multiSelectCls, mode === 'multi');
        return this.modes[mode] ? mode : 'single';
    },
    updateMode: function(mode) {
        var selection = this.getSelection();
        if (mode !== 'multi' && selection.getCount() > 1) {
            selection.add(this.getLastSelected(), false);
        }
    },
    updateView: function(view) {
        this.setStore(view ? view.getStore() : null);
    },
    applyStore: function(store) {
        return store ? Ext.data.StoreManager.lookup(store) : null;
    },
    updateStore: function(newStore, oldStore) {
        var me = this,
            bindEvents = Ext.apply({
                scope: me
            }, me.getStoreListeners());
        if (oldStore && Ext.isObject(oldStore) && oldStore.isStore) {
            oldStore.un(bindEvents);
        }
        if (newStore) {
            newStore.on(bindEvents);
            if (oldStore) {
                me.refreshSelection();
            }
        }
    },
    selectByLocation: function(location) {
        if (!location.isDataViewLocation) {
            Ext.raise('selectByLocation MUST be passed an Ext.dataview.Location');
        }
        this.select(location.record);
    },
    selectAll: function(suppressEvent) {
        this.select(this.getStore().getRange(), true, suppressEvent);
    },
    deselectAll: function(suppressEvent) {
        var selected = this.getSelected();
        selected.suppressEvent = suppressEvent;
        selected.removeAll();
        selected.suppressEvent = false;
    },
    applySelectedRecord: function(selectedRecord) {
        if (selectedRecord === false) {
            selectedRecord = null;
        }
        return selectedRecord;
    },
    updateSelectedRecord: function(selectedRecord) {
        var me = this,
            selected = me.getSelected(),
            selectionCount = selected.getCount();
        if (selectedRecord) {
            if (selected.last() !== selectedRecord) {
                if (me.getMode() === 'single') {
                    selected.splice(0, selectionCount, selectedRecord);
                } else {
                    selected.add(selectedRecord);
                }
            }
            me.setLastSelected(selectedRecord);
        } else {
            if (!me.isConfiguring && selectionCount) {
                me.deselectAll();
            }
        }
        me.getView().publishState('selection', selectedRecord);
    },
    selectWithEvent: function(record, e) {
        var me = this,
            mode = me.getMode(),
            isSelected = me.isSelected(record);
        if (mode === 'multi') {
            me.selectWithEventMulti(record, e, isSelected);
        } else {
            if (isSelected) {
                if (me.getDeselectable() && (mode === 'single' && me.getToggleOnClick()) || mode === 'simple' || e.ctrlKey) {
                    me.deselect(record);
                }
            } else {
                me.select(record, mode === 'simple');
            }
        }
        if (!e.shiftKey && me.isSelected(record)) {
            me.selectionStart = record;
        }
    },
    selectWithEventMulti: function(record, e, isSelected) {
        var me = this,
            shift = e.shiftKey,
            ctrl = e.ctrlKey,
            start = shift ? me.selectionStart : null;
        if (shift && start) {
            me.selectRange(start, record, ctrl);
        } else {
            if (isSelected) {
                me.deselect(record);
            } else {
                me.select(record, true);
            }
        }
    },
    selectRange: function(startRecord, endRecord, keepExisting) {
        var store = this.getStore(),
            tmp;
        startRecord = (typeof startRecord === 'number') ? startRecord : store.indexOf(startRecord);
        endRecord = (typeof endRecord === 'number') ? endRecord : store.indexOf(endRecord);
        if (startRecord > endRecord) {
            tmp = startRecord;
            startRecord = endRecord;
            endRecord = tmp;
        }
        this.getSelection().addRowRange(startRecord, endRecord + 1, keepExisting);
    },
    select: function(records, keepExisting, suppressEvent) {
        var me = this,
            record;
        if (me.getDisabled()) {
            return;
        }
        if (typeof records === "number") {
            records = [
                me.getStore().getAt(records)
            ];
        }
        if (!records) {
            return;
        }
        if (me.getMode() === "single" && records) {
            record = records.length ? records[0] : records;
            me.doSingleSelect(record, suppressEvent);
        } else {
            me.doMultiSelect(records, keepExisting, suppressEvent);
        }
    },
    doSingleSelect: function(record, suppressEvent) {
        this.doMultiSelect([
            record
        ], false, suppressEvent);
    },
    doMultiSelect: function(records, keepExisting, suppressEvent) {
        if (records === null || this.getDisabled()) {
            return;
        }
        this.getSelection().add(records, keepExisting, suppressEvent);
    },
    deselect: function(records, suppressEvent) {
        var me = this,
            selection, store, len, i, record;
        if (me.getDisabled()) {
            return;
        }
        records = Ext.isArray(records) ? records : [
            records
        ];
        selection = me.getSelection();
        store = me.getStore();
        len = records.length;
        for (i = 0; i < len; i++) {
            record = records[i];
            if (typeof record === 'number') {
                records[i] = store.getAt(record);
            }
        }
        selection.remove(records, suppressEvent);
    },
    onCollectionRemove: function(selectedCollection, chunk) {
        var me = this,
            view = me.getView(),
            records = chunk.items;
        me.getSelection().allSelected = this.allSelected = false;
        if (!chunk.next && !chunk.replacement) {
            me.setSelectedRecord(selectedCollection.last() || null);
        }
        view.onItemDeselect(records, selectedCollection.suppressEvent);
        if (!selectedCollection.suppressEvent) {
            me.fireSelectionChange(records, false);
        }
    },
    onCollectionAdd: function(selectedCollection, adds) {
        var me = this,
            view = me.getView(),
            selection = me.getSelection(),
            records = adds.items;
        if (view.destroyed) {
            return;
        }
        selection.allSelected = this.allSelected = selection.getCount() === view.getStore().getCount();
        me.setSelectedRecord(selectedCollection.last() || null);
        view.onItemSelect(me.getMode() === 'single' ? records[0] : records, selectedCollection.suppressEvent);
        if (!selectedCollection.suppressEvent) {
            me.fireSelectionChange(records, true);
        }
    },
    fireSelectionChange: function(records, selected) {
        this.fireEvent('selectionchange', this.getView(), records, selected);
    },
    getSelections: function() {
        if (this.getSelection().isRecords) {
            return this.getSelected().getRange();
        }
    },
    isRowSelected: function(record) {
        var me = this,
            sel = me.getSelection();
        if (sel && (sel.isRows || sel.isRecords)) {
            record = Ext.isNumber(record) ? me.getStore().getAt(record) : record;
            return sel.isSelected(record);
        }
        return false;
    },
    isSelected: function(record) {
        return this.getSelection().isSelected(record);
    },
    hasSelection: function() {
        return this.getSelection().getCount() > 0;
    },
    refreshSelection: function() {
        if (this.getSelection().isRecords) {
            this.getSelection().refresh();
        }
    },
    onSelectionStoreRemove: function(store, records) {
        var selection = this.getSelection();
        if (selection.isRecords) {
            selection.remove(records);
        }
    },
    onSelectionStoreClear: function(store) {
        this.getSelection().clear();
    },
    getSelectionCount: function() {
        return this.getSelection().getCount();
    },
    destroy: function() {
        var me = this;
        me.setView(null);
        Ext.destroy(me.selection, me.destroySelected ? me.selected : null);
    },
    onIdChanged: function(store, rec, oldId, newId) {
        var selected = this.getSelected();
        if (selected) {
            selected.updateKey(rec, oldId);
        }
    },
    onSelectionStoreAdd: Ext.emptyFn,
    onSelectionStoreLoad: Ext.emptyFn,
    onSelectionStoreUpdate: Ext.emptyFn,
    onItemSelect: Ext.emptyFn,
    onItemDeselect: Ext.emptyFn,
    onEditorKey: Ext.emptyFn,
    privates: {
        addIgnoredFilter: function(filter) {
            if (filter) {
                Ext.Array.include(this.ignoredFilters || (this.ignoredFilters = []), filter);
            }
        },
        removeIgnoredFilter: function(filter) {
            var ignoredFilters = this.ignoredFilters;
            if (ignoredFilters) {
                Ext.Array.remove(ignoredFilters, filter);
                if (!ignoredFilters.length) {
                    this.ignoredFilters = null;
                }
            }
        },
        onSelectionFinish: Ext.privateFn,
        applySelection: function(selection, oldSelection) {
            if (oldSelection) {
                if (oldSelection.type === selection.type) {
                    oldSelection.setConfig(selection);
                    return oldSelection;
                }
                Ext.destroy(oldSelection);
            }
            if (selection) {
                var store = this.getStore();
                selection = Ext.Factory.selection(Ext.apply({
                    selectionModel: this,
                    type: (store && store.isVirtualStore) ? 'rows' : 'records',
                    selected: this.getSelected()
                }, selection));
            }
            return selection;
        }
    },
    statics: {
        refreshCollection: function(collection, filteredCollection, ignoredFilters, beforeRefresh) {
            var filterFn = filteredCollection.getFilters().getFilterFn(),
                selections,
                toRemove = [],
                toAdd = [],
                len, selectionLength, i, rec, matchingSelection, toReEnable;
            if (ignoredFilters) {
                toReEnable = [];
                len = ignoredFilters.length;
                for (i = 0; i < len; i++) {
                    if (!ignoredFilters[i].getDisabled()) {
                        toReEnable.push(ignoredFilters[i]);
                        ignoredFilters[i].setDisabled(true);
                    }
                }
                if (toReEnable.length) {
                    filteredCollection = filteredCollection.getSource() || filteredCollection;
                } else {
                    ignoredFilters = null;
                }
            }
            if (collection.getCount()) {
                selections = collection.getRange();
                selectionLength = selections.length;
                for (i = 0; i < selectionLength; i++) {
                    rec = selections[i];
                    matchingSelection = filteredCollection.get(filteredCollection.getKey(rec));
                    if (matchingSelection && ignoredFilters && !filterFn(matchingSelection)) {
                        matchingSelection = null;
                    }
                    if (matchingSelection) {
                        if (matchingSelection !== rec) {
                            toRemove.push(rec);
                            toAdd.push(matchingSelection);
                        }
                    } else {
                        toRemove.push(rec);
                    }
                }
                if (beforeRefresh) {
                    beforeRefresh(toRemove, toAdd);
                }
                collection.suppressEvent = true;
                collection.splice(collection.getCount(), toRemove, toAdd);
                collection.suppressEvent = false;
            }
            if (toReEnable) {
                len = toReEnable.length;
                for (i = 0; i < len; i++) {
                    toReEnable[i].setDisabled(false);
                }
            }
        }
    }
});

Ext.define('Ext.dataview.EmptyText', {
    extend: Ext.Component,
    xtype: 'emptytext',
    classCls: Ext.baseCSSPrefix + 'emptytext',
    inheritUi: true,
    html: 'No data to display',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0
});

Ext.define('Ext.dataview.Abstract', {
    extend: Ext.Container,
    mixins: [
        Ext.mixin.ConfigProxy,
        Ext.mixin.ItemRippler
    ],
    isDataView: true,
    cachedConfig: {
        associatedData: null,
        deferEmptyText: true,
        deselectOnContainerClick: true,
        disableSelection: false,
        emptyTextDefaults: {
            xtype: 'emptytext'
        },
        emptyItemText: '\xa0',
        itemsFocusable: true,
        itemTpl: '<div>{text:htmlEncode}</div>',
        loadingText: 'Loading...',
        pressedDelay: 100,
        scrollToTopOnRefresh: true,
        storeEventListeners: {
            add: 'onStoreAdd',
            beforeload: 'onStoreBeforeLoad',
            clear: 'onStoreClear',
            load: 'onStoreLoad',
            refresh: 'onStoreRefresh',
            remove: 'onStoreRemove',
            update: 'onStoreUpdate'
        },
        triggerEvent: 'childtap',
        triggerCtEvent: 'tap'
    },
    config: {
        itemButtonMode: false,
        data: null,
        emptyState: null,
        emptyText: null,
        enableTextSelection: null,
        inline: null,
        itemCls: null,
        loadingHeight: null,
        markDirty: null,
        navigationModel: {
            type: 'dataview'
        },
        selectable: true
    },
    autoSize: null,
    publishes: {
        selection: 1
    },
    twoWayBindable: {
        selection: 1
    },
    eventedConfig: {
        store: undefined
    },
    proxyConfig: {
        selectable: {
            configs: [
                'mode',
                'deselectable',
                'lastSelected',
                'selected'
            ],
            methods: [
                'isSelected',
                'select',
                'selectAll',
                'deselectAll',
                'getSelections',
                'hasSelection',
                'getSelectionCount'
            ]
        }
    },
    emptyTextProperty: 'html',
    restoreFocus: true,
    refreshCounter: 0,
    selectionModel: 'dataview',
    defaultBindProperty: 'store',
    focusable: true,
    scrollable: true,
    tabIndex: 0,
    classCls: Ext.baseCSSPrefix + 'dataview',
    focusedCls: Ext.baseCSSPrefix + 'focused',
    hoveredCls: Ext.baseCSSPrefix + 'hovered',
    inlineCls: Ext.baseCSSPrefix + 'inline',
    noWrapCls: Ext.baseCSSPrefix + 'nowrap',
    pressedCls: Ext.baseCSSPrefix + 'pressed',
    scrollDockCls: Ext.baseCSSPrefix + 'scrolldock',
    selectedCls: Ext.baseCSSPrefix + 'selected',
    hasLoadedStore: false,
    scrollDockedItems: null,
    storeListeners: null,
    _trueStore: null,
    beforeInitialize: function(config) {
        this.dataItems = [];
        this.callParent([
            config
        ]);
    },
    initialize: function() {
        var me = this;
        me.generateSelectorFunctions();
        me.callParent();
        me.bodyElement.on({
            touchstart: '_onChildTouchStart',
            touchend: '_onChildTouchEnd',
            touchcancel: '_onChildTouchCancel',
            tap: '_onChildTap',
            tapcancel: '_onChildTapCancel',
            longpress: '_onChildLongPress',
            taphold: '_onChildTapHold',
            singletap: '_onChildSingleTap',
            doubletap: '_onChildDoubleTap',
            swipe: '_onChildSwipe',
            mouseover: '_onChildMouseOver',
            mouseout: '_onChildMouseOut',
            contextmenu: '_onChildContextMenu',
            delegate: me.eventDelegate,
            scope: me
        });
        if (Ext.scrollbar.width()) {
            me.bodyElement.on('touchstart', '_onContainerTouchStart', me);
        }
        me.on(me.getTriggerCtEvent(), 'onContainerTrigger', me);
    },
    onRender: function() {
        var me = this;
        me.callParent();
        if (me.forceRefreshOnRender) {
            me.runRefresh();
        } else {
            me.refresh();
        }
    },
    doDestroy: function() {
        var me = this;
        me.destroyAllRipples();
        me.clearPressedTimer();
        me.setStore(null);
        me.setNavigationModel(null);
        me.setSelectable(null);
        me.lastPressedLocation = null;
        me.callParent();
    },
    createEmptyText: function(emptyText) {
        var ret = Ext.apply({}, this.getEmptyTextDefaults());
        if (typeof emptyText === 'string') {
            ret[this.emptyTextProperty] = emptyText;
        } else if (emptyText) {
            Ext.apply(ret, emptyText);
        }
        ret.isEmptyText = ret.hidden = true;
        ret.showInEmptyState = null;
        return ret;
    },
    ensureVisible: function(record, options) {
        var me = this,
            plan = me.ensureVisiblePlan(record, options),
            step;
        for (; ; ) {
            if (!(step = plan.steps.pop())) {
                break;
            }
            me[step](plan);
        }
        return plan.promise;
    },
    gatherData: function(record, recordIndex) {
        var me = this,
            data = record && record.getData(me.associatedData);
        if (data) {
            if (recordIndex === undefined) {
                recordIndex = me.store.indexOf(record);
            }
            data = me.prepareData(data, recordIndex, record);
        }
        return data || null;
    },
    getFirstDataItem: function() {
        return this.dataItems[0] || null;
    },
    getFirstItem: function() {
        return this.getFastItems()[0] || null;
    },
    getItemAt: function(index) {
        var items = this.getFastItems();
        if (index < 0) {
            index += items.length;
        }
        return items[index] || null;
    },
    getItemIndex: function(item) {
        return this.mapToRecordIndex(item);
    },
    getItem: function(record) {
        var ret = null,
            idx;
        if (record) {
            idx = record.isEntity ? this.store.indexOf(record) : record;
            if (idx > -1) {
                ret = this.getItemAt(idx);
            }
        }
        return ret;
    },
    getLastDataItem: function() {
        var dataItems = this.dataItems;
        return dataItems[dataItems.length - 1] || null;
    },
    getLastItem: function() {
        var items = this.getFastItems();
        return items[items.length - 1];
    },
    getScrollDockedItems: function(which) {
        var scrollDock = this.scrollDockedItems;
        if (scrollDock) {
            if (which) {
                which = this.scrollDockAliases[which] || which;
                scrollDock = scrollDock[which].slice();
            } else {
                scrollDock = scrollDock.start.items.concat(scrollDock.end.items);
            }
        }
        return scrollDock || [];
    },
    isItemSelected: function(item) {
        var record = this.mapToRecord(item);
        return record ? this.isSelected(record) : false;
    },
    isFirstItem: function(item) {
        return Ext.getDom(item) === this.getFirstItem();
    },
    isFirstDataItem: function(item) {
        return Ext.getDom(item) === this.getFirstDataItem();
    },
    isLastItem: function(item) {
        return Ext.getDom(item) === this.getLastItem();
    },
    isLastDataItem: function(item) {
        return Ext.getDom(item) === this.getLastDataItem();
    },
    mapToItem: function(value, as) {
        var me = this,
            el = me.element,
            item, items;
        if (value && value.isEvent) {
            item = value.getTarget(me.itemSelector, el);
        } else if (value && (value.isElement || value.nodeType === 1)) {
            item = Ext.fly(value).findParent(me.itemSelector, el);
        } else if (value && value.isEntity) {
            item = me.itemFromRecord(value);
        } else {
            if (value && value.isComponent && me.items.contains(value)) {
                item = value;
            } else {
                items = me.getFastItems();
                if (value < 0) {
                    value += items.length;
                }
                item = items[value || 0];
            }
        }
        if (item) {
            item = me.itemAs(item, as || (me.isElementDataView ? 'el' : 'cmp'));
        }
        return item || null;
    },
    mapToRecord: function(value) {
        var me = this,
            item = value,
            el = me.element,
            store = me.store,
            dom, rec;
        if (item && item.isEntity) {
            if (store && store.getById(item.id) === item) {
                rec = item;
            }
            item = null;
        } else if (item && item.isEvent) {
            item = item.getTarget(me.itemSelector, el);
        } else if (item && (item.isElement || item.nodeType === 1)) {
            item = Ext.fly(item).findParent(me.itemSelector, el);
        } else if (typeof item === 'number') {
            item = me.mapToItem(item);
        }
        if (item) {
            dom = item.isWidget ? item.el : item;
            dom = dom.dom || dom;
            if (me.itemSelector(dom)) {
                rec = dom.getAttribute('data-recordid');
                rec = rec && store.getByInternalId(+rec);
            }
        }
        return rec || null;
    },
    mapToRecordIndex: function(value, uncollapsed) {
        var me = this,
            rec = me.mapToRecord(value),
            index = -1,
            store = me.store;
        if (rec) {
            if (uncollapsed && store.isGroupStore) {
                store = store.getSource();
            }
            index = store.indexOf(rec);
        }
        return index;
    },
    mapToViewIndex: function(value, indexOffset) {
        var me = this,
            index = -1,
            item = value,
            el = me.element,
            items = me.getFastItems(),
            dom;
        if (typeof item === 'number') {
            indexOffset = indexOffset || 0;
            for (; item < items.length; ++item) {
                dom = items[item];
                if (dom.isWidget) {
                    dom = dom.el.dom;
                }
                if (+dom.getAttribute('data-recordindex') === item + indexOffset) {
                    index = item;
                    break;
                }
            }
        } else if (item) {
            if (item.isEntity) {
                item = me.itemFromRecord(item);
            } else if (item.isEvent) {
                item = item.getTarget(me.itemSelector, el);
            } else if (item.isElement || item.nodeType === 1) {
                item = Ext.fly(item).findParent(me.itemSelector, el);
            }
            if (item && items.length) {
                if (items[0].isWidget) {
                    if (!item.isWidget) {
                        item = Ext.Component.from(item);
                    }
                } else {
                    item = item.nodeType ? item : item.el.dom;
                }
                index = Array.prototype.indexOf.call(items, item);
            }
        }
        return index;
    },
    nextItem: function(item, as) {
        var next = this.traverseItem(item, 1);
        return as ? this.itemAs(next, as) : next;
    },
    previousItem: function(item, as) {
        var prev = this.traverseItem(item, -1);
        return as ? this.itemAs(prev, as) : prev;
    },
    prepareData: function(data, index, record) {
        return data;
    },
    refresh: function() {
        this.whenVisible('runRefresh');
    },
    setLocation: function(location, options) {
        return this.getNavigationModel().setLocation(location, options);
    },
    onFocusEnter: function(e) {
        var me = this;
        me.callParent([
            e
        ]);
        if (!(e.within(me.getRenderTarget()) || e.target === me.getFocusEl().dom)) {
            return;
        }
        return me.onInnerFocusEnter(e);
    },
    onInnerFocusEnter: function(e) {
        var me = this,
            navigationModel = me.getNavigationModel(),
            focusPosition, itemCount;
        if (navigationModel.lastLocation === 'scrollbar') {
            if (e.relatedTarget) {
                e.relatedTarget.focus();
            }
            return;
        }
        if (e.target === me.getFocusEl().dom) {
            focusPosition = me.restoreFocus && navigationModel.getPreviousLocation();
            if (focusPosition) {
                focusPosition = focusPosition.refresh();
            }
            else if (e.backwards) {
                focusPosition = me.getLastDataItem();
            } else {
                focusPosition = me.getFirstDataItem();
            }
        } else {
            focusPosition = e;
        }
        me.toggleChildrenTabbability(false);
        itemCount = me.getFastItems().length;
        if (itemCount) {
            if (focusPosition.isWidget) {
                focusPosition = focusPosition.getFocusEl() || focusPosition.el;
            }
            navigationModel.setLocation(focusPosition, {
                event: e,
                navigate: false
            });
        }
        if (navigationModel.getLocation()) {
            me.el.dom.setAttribute('tabIndex', -1);
        }
    },
    onFocusLeave: function(e) {
        var me = this,
            navModel = me.getNavigationModel();
        if (navModel.getLocation()) {
            navModel.setLocation(null, {
                event: e
            });
            me.el.dom.setAttribute('tabIndex', 0);
        }
        me.callParent([
            e
        ]);
    },
    onInnerFocusLeave: function(e) {
        this.getNavigationModel().setLocation(null, {
            event: e
        });
    },
    onFocusMove: function(e) {
        var me = this,
            el = me.el,
            renderTarget = me.getRenderTarget(),
            toComponent = e.event.toComponent,
            fromComponent = e.event.fromComponent;
        if (!el.contains(e.toElement)) {
            return me.callParent([
                e
            ]);
        }
        if (el.contains(e.toElement) && !renderTarget.contains(e.toElement) && renderTarget.contains(e.fromElement)) {
            return me.onInnerFocusLeave(e.event);
        }
        if (el.contains(e.fromElement) && !renderTarget.contains(e.fromElement) && renderTarget.contains(e.toElement)) {
            return me.onInnerFocusEnter(e.event);
        }
        if (!renderTarget.contains(e.fromElement) && !renderTarget.contains(e.toElement)) {
            return me.callParent([
                e
            ]);
        }
        if ((toComponent === me || toComponent.up('dataview,componentdataview') === me) && (fromComponent === me || fromComponent.up('dataview,componentdataview') === me)) {
            me.getNavigationModel().onFocusMove(e.event);
        }
        return me.callParent([
            e
        ]);
    },
    onItemAdd: function(item, index) {
        var me = this,
            scrollDock = item.scrollDock,
            scrollDockCls = me.scrollDockCls,
            scrollDockedItems;
        if (!item.$dataItem && item.isInner) {
            if (scrollDock !== null) {
                scrollDock = scrollDock || 'end';
            }
            if (scrollDock) {
                if (!(scrollDockedItems = me.scrollDockedItems)) {
                    me.scrollDockedItems = scrollDockedItems = {
                        start: {
                            items: [],
                            height: 0,
                            filter: me.filterScrollDockStart,
                            name: scrollDock
                        },
                        end: {
                            items: [],
                            height: 0,
                            filter: me.filterScrollDockEnd,
                            name: scrollDock
                        }
                    };
                }
                scrollDock = me.scrollDockAliases[scrollDock] || scrollDock;
                if (!scrollDockedItems[scrollDock]) {
                    Ext.raise('Invalid value for scrollDock: ' + item.scrollDock);
                }
                item.scrollDock = scrollDock;
                scrollDock = scrollDockedItems[scrollDock];
                scrollDock.items = me.innerItems.filter(scrollDock.filter);
                if (item.showInEmptyState === undefined) {
                    item.showInEmptyState = false;
                }
                item.addCls(scrollDockCls + ' ' + scrollDockCls + '-' + scrollDock.name);
                if (me.getItemsFocusable()) {
                    item.el.set({
                        tabIndex: -1
                    });
                }
                if (me.addScrollDockedItem) {
                    me.addScrollDockedItem(item);
                }
            }
        }
        me.callParent([
            item,
            index
        ]);
    },
    onItemDeselect: function(records, suppressEvent) {
        var me = this;
        if (!me.isConfiguring && !me.destroyed) {
            if (suppressEvent) {
                me.setItemSelection(records, false);
            } else {
                me.fireEventedAction('deselect', [
                    me,
                    records
                ], 'setItemSelection', me, [
                    records,
                    false
                ]);
            }
        }
    },
    onItemSelect: function(records, suppressEvent) {
        var me = this;
        if (suppressEvent) {
            me.setItemSelection(records, true);
        } else {
            me.fireEventedAction('select', [
                me,
                records
            ], 'setItemSelection', me, [
                records,
                true
            ]);
        }
    },
    onChildTouchStart: function(location) {
        var me = this,
            child = location.item,
            e = location.event,
            hasListeners = me.hasListeners,
            curLocation = me.getNavigationModel().getLocation(),
            actionable = curLocation && curLocation.actionable,
            name, skip;
        if (!location.actionable && !(location.equalCell || location.equals)(curLocation)) {
            me.rippleItem(child, e);
        }
        name = 'beforechildtouchstart';
        skip = hasListeners[name] && me.fireEvent(name, me, location) === false;
        if (!skip) {
            name = 'beforeitemtouchstart';
            skip = hasListeners[name] && me.fireEvent(name, me, location.viewIndex, child, location.record, e) === false;
        }
        if (!skip) {
            if (!actionable) {
                me.doChildTouchStart(location);
            }
            me.fireChildEvent('touchstart', location);
        }
    },
    onChildTouchEnd: function(location) {
        var me = this,
            child = location.item,
            curLocation = me.getNavigationModel().getLocation(),
            e = location.event;
        if (!(curLocation && curLocation.actionable)) {
            me.rippleItem(child, e);
        }
        me.clearPressedCls('touchend', location);
    },
    onChildTouchCancel: function(location) {
        this.clearPressedCls('touchcancel', location);
    },
    onChildTouchMove: function(location) {
        this.fireChildEvent('touchmove', location);
    },
    onChildTap: function(location) {
        this.fireChildEvent('tap', location);
    },
    onChildTapCancel: function(location) {
        var me = this,
            itemButtonMode = me.getItemButtonMode();
        if (!itemButtonMode) {
            this.clearPressedCls('tapcancel', location);
        }
    },
    onChildContextMenu: function(location) {
        this.fireChildEvent('contextmenu', location);
    },
    onChildLongPress: function(location) {
        this.fireChildEvent('longpress', location);
    },
    onChildTapHold: function(location) {
        this.fireChildEvent('taphold', location);
    },
    onChildSingleTap: function(location) {
        this.fireChildEvent('singletap', location);
    },
    onChildDoubleTap: function(location) {
        this.fireChildEvent('doubletap', location);
    },
    onChildSwipe: function(location) {
        this.fireChildEvent('swipe', location);
    },
    onChildMouseOver: function(location) {
        var me = this,
            child = location.item;
        if (me.mouseOverItem !== child) {
            me.mouseOverItem = child;
            if (me.doHover) {
                me.toggleHoverCls(true);
            }
            me.fireChildEvent('mouseenter', location);
        }
    },
    onChildMouseOut: function(location) {
        var me = this,
            itemButtonMode = me.getItemButtonMode(),
            child = location.item,
            relatedTarget = location.event.getRelatedTarget(me.itemSelector);
        if (child && child.dom !== relatedTarget) {
            if (me.doHover) {
                me.toggleHoverCls(false);
            }
            if (!itemButtonMode) {
                this.clearPressedCls('mouseleave', location);
            } else {
                me.fireChildEvent('mouseleave', location);
            }
            me.mouseOverItem = null;
        }
    },
    onNavigate: function(e) {
        var me = this,
            selectable = !me.destroyed && me.getSelectable();
        if (selectable && me.shouldSelectItem(e)) {
            selectable.onNavigate(e);
        }
    },
    shouldSelectItem: function(e) {
        var me = this,
            selectable = me.getSelectable(),
            no = e.stopSelection || !selectable || selectable.getDisabled() || (e.isNavKeyPress() && e.ctrlKey),
            target = !no && e.getTarget('.' + Ext.baseCSSPrefix + 'item-no-select,.' + Ext.baseCSSPrefix + 'item-no-tap', this.element);
        if (target) {
            no = me.el.contains(target);
        }
        return !no;
    },
    onStoreAdd: function() {
        this.syncEmptyState();
    },
    onStoreBeforeLoad: function() {
        this.handleBeforeLoad();
    },
    onStoreClear: function() {
        this.doClear();
    },
    onStoreLoad: function() {
        this.hasLoadedStore = true;
        this.clearMask();
        this.syncEmptyState();
    },
    onStoreRefresh: function() {
        this.refresh();
    },
    onStoreRemove: function() {
        this.syncEmptyState();
    },
    onStoreUpdate: function(store, record, type, modifiedFieldNames, info) {
        var me = this,
            item;
        if (!info || !(info.indexChanged || info.filtered)) {
            item = me.itemFromRecord(record);
            if (item) {
                me.syncItemRecord({
                    item: item,
                    modified: me.indexModifiedFields(modifiedFieldNames),
                    record: record
                });
            }
        }
        if (me.isSelected(record)) {
            me.setItemSelection(record, true);
        }
    },
    updateAssociatedData: function(assocData) {
        this.associatedData = {
            associated: assocData
        };
    },
    updateData: function(data) {
        var me = this,
            store = me.store;
        if (!store) {
            me.settingStoreFromData = true;
            me.setStore({
                data: data,
                autoDestroy: true
            });
            me.settingStoreFromData = false;
        } else {
            store.loadData(data);
        }
    },
    updateDisableSelection: function(value) {
        var el = this.getRenderTarget();
        el.toggleCls(this.showSelectionCls, !value);
    },
    updateEmptyText: function(emptyText) {
        var me = this,
            config = emptyText,
            emptyTextCmp = me.emptyTextCmp;
        if (emptyTextCmp) {
            if (!emptyText || typeof emptyText === 'string') {
                config = {};
                config[me.emptyTextProperty] = emptyText || '\xa0';
            }
            emptyTextCmp.setConfig(config);
        }
        if (!me.isConfiguring) {
            me.syncEmptyState();
        }
    },
    updateEnableTextSelection: function(enableTextSelection) {
        this.setUserSelectable({
            bodyElement: !!enableTextSelection
        });
    },
    updateInline: function(inline) {
        var me = this,
            noWrap = inline && inline.wrap === false;
        me.toggleCls(me.inlineCls, !!inline);
        if (Ext.isEdge && noWrap) {
            me.el.measure('w');
        }
        me.toggleCls(me.noWrapCls, noWrap);
    },
    updateItemCls: function(newCls, oldCls) {
        if (!this.isConfiguring) {
            var items = this.dataItems,
                len = items.length,
                i, item;
            for (i = 0; i < len; i++) {
                item = items[i];
                item = item.isWidget ? item.el : Ext.fly(item);
                item.replaceCls(oldCls, newCls);
            }
        }
    },
    applyItemTpl: function(config) {
        return Ext.XTemplate.get(config);
    },
    updateItemTpl: function() {
        if (!this.isConfiguring) {
            this.refresh();
        }
    },
    updateMarkDirty: function(markDirty) {
        var dataItems = this.dataItems,
            i, ln, dataItem;
        markDirty = !!markDirty;
        for (i = 0 , ln = dataItems.length; i < ln; i++) {
            dataItem = dataItems[i];
            (dataItem.el || Ext.fly(dataItem)).toggleCls(this.markDirtyCls, markDirty);
        }
    },
    updateMasked: function(masked) {
        var me = this,
            loadingHeight = me.getLoadingHeight();
        if (masked) {
            if (loadingHeight && loadingHeight > me.el.getHeight()) {
                me.hasLoadingHeight = true;
                me.oldMinHeight = me.getMinHeight();
                me.setMinHeight(loadingHeight);
            }
        } else {
            if (!me.destroying && me.hasLoadingHeight) {
                me.setMinHeight(me.oldMinHeight);
                delete me.hasLoadingHeight;
            }
        }
    },
    applySelectable: function(selectable, oldSelectable) {
        var me = this,
            config = {
                type: me.selectionModel,
                view: me
            },
            record = me.selection;
        if (selectable === false) {
            selectable = {
                disabled: true
            };
        }
        if (selectable) {
            if (typeof selectable === 'string') {
                selectable = {
                    type: me.selectionModel,
                    mode: selectable.toLowerCase(),
                    view: me
                };
            } else if (selectable.isSelectionModel) {
                return selectable.setConfig(config);
            } else {
                selectable = Ext.apply(config, selectable);
            }
            if (oldSelectable) {
                if (selectable.isSelectionModel || selectable.type !== oldSelectable.type) {
                    Ext.raise('Switching out selectables dynamically is not supported');
                }
                selectable = oldSelectable.setConfig(selectable);
            } else {
                selectable = Ext.Factory.selmodel(me.mergeProxiedConfigs('selectable', selectable));
            }
            if (record) {
                delete me.selection;
                if (!record.isEntity) {
                    Ext.raise('DataView selection config must be single record');
                }
                if (selectable.getRecords && !selectable.getRecords()) {
                    Ext.raise('DataView selection model is configured to not accept records');
                }
                selectable.select(record);
            }
        }
        return selectable;
    },
    applyStore: function(store) {
        var ret = store ? Ext.data.StoreManager.lookup(store) : null;
        this.store = this._trueStore = ret;
        return ret;
    },
    updateStore: function(newStore, oldStore) {
        var me = this,
            mask = me.autoMask,
            newLoad;
        if (oldStore) {
            if (!oldStore.destroyed) {
                if (oldStore.getAutoDestroy()) {
                    oldStore.destroy();
                } else {
                    Ext.destroy(me.storeListeners);
                }
            }
            me.dataRange = me.storeListeners = Ext.destroy(me.dataRange);
            if (!me.destroying && !me.destroyed && !newStore) {
                me.doClear();
            }
        }
        if (newStore) {
            if (me.destroying) {
                return;
            }
            me.attachStoreEvents(newStore, Ext.apply({
                scope: me,
                destroyable: true
            }, me.getStoreEventListeners()));
            if (newStore.isLoaded()) {
                me.hasLoadedStore = true;
            }
            newLoad = !newStore.isTreeStore && newStore.hasPendingLoad();
            me.bindStore(newStore);
            if (me.initialized) {
                me.refresh();
            }
        }
        if (!me.isConfiguring || me.settingStoreFromData) {
            me.getSelectable().setStore(newStore);
        }
        if (mask && !newLoad) {
            me.setMasked(false);
            me.autoMask = false;
        } else if (!mask && newLoad) {
            me.handleBeforeLoad();
        }
    },
    updateHidden: function(hidden, oldHidden) {
        this.callParent([
            hidden,
            oldHidden
        ]);
        this.destroyAllRipples();
    },
    privates: {
        associatedData: true,
        doHover: true,
        showSelectionCls: Ext.baseCSSPrefix + 'show-selection',
        multiSelectCls: Ext.baseCSSPrefix + 'multi-select',
        markDirtyCls: Ext.baseCSSPrefix + 'mark-dirty',
        scrollbarSelector: '.' + Ext.baseCSSPrefix + 'scrollbar',
        scrollDockAliases: {
            top: 'start',
            bottom: 'end'
        },
        attachStoreEvents: function(store, listeners) {
            this.storeListeners = store.on(listeners);
        },
        createLocation: function() {
            var nav = this.getNavigationModel();
            return nav.createLocation.apply(nav, arguments);
        },
        getSelection: function() {
            return this.getSelectable().getSelectedRecord();
        },
        setSelection: function(record) {
            return this.getSelectable().setSelectedRecord(record);
        },
        generateSelectorFunctions: function() {
            var renderTarget = this.getRenderTarget(),
                bodyElement = this.bodyElement;
            this.eventDelegate = this.itemSelector = function(candidate) {
                return candidate && (candidate.parentNode === bodyElement.dom || candidate.parentNode === renderTarget.dom);
            };
        },
        bindStore: function(store) {
            this._trueStore = store;
            this.dataRange = store.createActiveRange();
        },
        clearMask: function() {
            this.setMasked(false);
            this.autoMask = false;
        },
        clearPressedCls: function(type, location) {
            var me = this,
                record = location.record,
                child = location.child,
                el;
            me.clearPressedTimer();
            if (record && child) {
                el = child.isWidget ? child.element : Ext.fly(child);
                el.removeCls(me.pressedCls);
            }
            me.fireChildEvent(type, location);
        },
        clearPressedTimer: function() {
            var timeout = this.pressedTimeout;
            if (timeout) {
                Ext.undefer(timeout);
                delete this.pressedTimeout;
            }
        },
        doAddPressedCls: function(record) {
            var me = this,
                item = me.itemFromRecord(record);
            if (item) {
                item = item.isWidget ? item.element : Ext.fly(item);
                item.addCls(me.pressedCls);
            }
        },
        doClear: function() {
            this.syncEmptyState();
        },
        doChildTouchStart: function(location) {
            var me = this,
                record = location.record,
                itemButtonMode = me.getItemButtonMode(),
                pressedDelay = me.getPressedDelay();
            me.clearPressedTimer();
            if (record) {
                if (pressedDelay > 0) {
                    me.pressedTimeout = Ext.defer(me.doAddPressedCls, pressedDelay, me, [
                        record
                    ]);
                } else {
                    me.doAddPressedCls(record);
                }
                if (itemButtonMode) {
                    me.lastPressedLocation = location;
                    Ext.GlobalEvents.setPressedComponent(me, location);
                }
            }
        },
        onRelease: function() {
            var me = this;
            if (me.lastPressedLocation) {
                me.clearPressedCls('release', me.lastPressedLocation);
            }
            me.lastPressedLocation = null;
        },
        ensureVisiblePlan: function(record, plan) {
            var store = this.store,
                recIndex;
            if (record.record) {
                plan = Ext.apply({}, record);
                record = plan.record;
                delete plan.record;
            } else {
                plan = Ext.apply({}, plan);
            }
            if (record.isEntity) {
                recIndex = store.indexOf(record);
            } else if (typeof record === 'number') {
                recIndex = record;
                record = store.getAt(record);
            } else {
                Ext.raise('ensureVisible first parameter must be record or recordIndex ' + 'or an options object with a record property');
            }
            plan.record = record;
            plan.recordIndex = recIndex;
            plan.animation = plan.animation || plan.animate;
            plan.async = !!plan.animation;
            plan.steps = [];
            if (recIndex < 0 || recIndex >= store.getCount()) {
                Ext.raise('Invalid record passed to ensureVisible');
                plan.promise = Ext.Deferred.getCachedRejected();
            } else {
                plan.steps.push('ensureVisibleFocus', 'ensureVisibleSelect', 'ensureVisiblePrep');
            }
            return plan;
        },
        ensureVisibleFocus: function(plan) {
            if (plan.focus) {
                var me = this,
                    isGrid = me.isGrid;
                if (isGrid && !('column' in plan)) {
                    plan.column = 0;
                }
                if (plan.async) {
                    plan.promise = plan.promise.then(function(o) {
                        me.getNavigationModel().setLocation(isGrid ? plan : plan.record);
                        return o;
                    });
                } else {
                    me.getNavigationModel().setLocation(isGrid ? plan : plan.record);
                }
            }
        },
        ensureVisiblePrep: function(plan) {
            var me = this,
                dataRange = me.dataRange,
                cleanup = function() {
                    delete dataRange.goto;
                    if (args) {
                        dataRange.goto(args[0], args[1]);
                    }
                },
                args, promise;
            if (plan.async) {
                dataRange.goto = function(begin, end) {
                    if (args) {
                        args[0] = begin;
                        args[1] = end;
                    } else {
                        args = [
                            begin,
                            end
                        ];
                    }
                };
                promise = me.ensureVisibleScroll(plan);
                promise = promise.then(function(v) {
                    cleanup();
                    return v;
                }, function(ex) {
                    cleanup();
                    throw ex;
                });
            } else {
                promise = me.ensureVisibleScroll(plan);
            }
            plan.promise = promise;
        },
        ensureVisibleScroll: function(plan) {
            var item = plan.item || (plan.item = this.itemFromRecord(plan.recIndex));
            return this.getScrollable().ensureVisbile(item.el, {
                animation: plan.animation
            });
        },
        ensureVisibleSelect: function(plan) {
            if (plan.select) {
                var me = this,
                    selectable = me.getSelectable(),
                    cell;
                if (plan.async) {
                    plan.promise = plan.promise.then(function(o) {
                        if (plan.column) {
                            cell = me.createLocation(plan);
                            selectable.selectCells(cell, cell);
                        } else {
                            selectable.select(plan.record);
                        }
                        return o;
                    });
                } else {
                    if (plan.column) {
                        cell = me.createLocation(plan);
                        selectable.selectCells(cell, cell);
                    } else {
                        selectable.select(plan.record);
                    }
                }
            }
        },
        filterScrollDockStart: function(item) {
            var scrollDock = item.scrollDock;
            return scrollDock === 'start' || scrollDock === 'top';
        },
        filterScrollDockEnd: function(item) {
            var scrollDock = item.scrollDock;
            return scrollDock === 'end' || scrollDock === 'bottom';
        },
        findTailItem: function(rawElements) {
            var me = this,
                items = rawElements ? me.innerItems : me.items.items,
                at = -1,
                tail = null,
                i, item, scrollDock;
            for (i = items.length; i-- > 0; ) {
                item = items[i];
                scrollDock = item.scrollDock;
                if (scrollDock === 'end') {
                    tail = items[at = i];
                } else {
                    break;
                }
            }
            return rawElements ? tail : at;
        },
        fireChildEvent: function(type, location) {
            var me = this,
                deprecatedName = 'item' + type,
                name = 'child' + type,
                hasListeners = me.hasListeners;
            if (hasListeners[name]) {
                me.fireEvent(name, me, location);
            }
            if (hasListeners[deprecatedName] && location.record) {
                me.fireEvent(deprecatedName, me, location.viewIndex, location.item, location.record, location.event);
            }
        },
        getEmptyTextCmp: function() {
            var me = this,
                cmp = me.emptyTextCmp;
            if (!cmp) {
                me.emptyTextCmp = cmp = me.add(me.createEmptyText(me.getEmptyText()));
            }
            return cmp;
        },
        getRecordIndexFromPoint: function(x, y) {
            var item = this.getItemFromPoint(x, y);
            return item ? this.mapToRecordIndex(item) : -1;
        },
        getItemFromPoint: function(x, y) {
            var me = this,
                scroller = me.getScrollable(),
                scrollPosition = scroller.getPosition(),
                scrollSize = scroller.getSize(),
                offset = me.getScrollerTarget().getXY();
            return me.getItemFromPagePoint(Math.max(Math.min(x, scrollSize.x), 0) + offset[0] - scrollPosition.x, Math.max(Math.min(y, scrollSize.y), 0) + offset[1] - scrollPosition.y);
        },
        getItemFromPagePoint: function(x, y) {
            var items = this.getFastItems(),
                len = items.length,
                point = new Ext.util.Point(x, y),
                ret = null,
                i, item, el;
            for (i = 0; i < len; i++) {
                item = items[i];
                el = item.isWidget ? item.element : Ext.fly(item);
                if (el.getRegion().contains(point)) {
                    ret = item.isWidget ? item : Ext.get(el);
                    break;
                }
            }
            return ret;
        },
        handleBeforeLoad: function() {
            var me = this,
                loadingText = me.getLoadingText();
            if (loadingText) {
                me.autoMask = true;
                me.setMasked({
                    xtype: 'loadmask',
                    message: loadingText
                });
            }
            me.hideEmptyText();
        },
        hideEmptyText: function() {
            var cmp = this.emptyTextCmp;
            if (cmp) {
                cmp.hide();
            }
        },
        indexModifiedFields: function(modified) {
            return modified;
        },
        itemAs: function(item, as) {
            var ret = item;
            if (as !== 'cmp' && as !== 'dom' && as !== 'el') {
                Ext.raise('Invalid "as" value "' + as + '" to mapToItem()');
            }
            if (typeof ret === 'number') {
                ret = null;
            } else if (ret) {
                if (as === 'cmp') {
                    if (!ret.isWidget) {
                        ret = Ext.getCmp(ret.id);
                    }
                } else {
                    if (ret.isWidget) {
                        ret = ret.el;
                    }
                    if (ret) {
                        if (ret.isElement) {
                            if (as === 'dom') {
                                ret = ret.dom;
                            }
                        } else if (as === 'el') {
                            ret = Ext.fly(ret);
                        }
                    }
                }
            }
            return ret;
        },
        itemFromRecord: function(rec) {
            var index = rec.isEntity ? this.store.indexOf(rec) : rec;
            return ((index > -1) && this.dataItems[index]) || null;
        },
        onContainerTrigger: function(e) {
            var me = this;
            if (e.target === me.element.dom) {
                if (me.getDeselectOnContainerClick() && me.store) {
                    me.getSelectable().deselectAll();
                }
            }
        },
        runRefresh: function() {
            var me = this,
                store = me.store,
                scrollToTopOnRefresh = me.getScrollToTopOnRefresh(),
                scroller = !scrollToTopOnRefresh && me.getScrollable(),
                maxY = scroller && scroller.getMaxPosition().y;
            me.syncEmptyState();
            if (store && !me.isConfiguring && (store.isTreeStore || !store.hasPendingLoad())) {
                me.fireEventedAction('refresh', [
                    me
                ], 'doRefresh', me, [
                    scrollToTopOnRefresh
                ]);
                if (scroller && scroller.getMaxPosition().y < maxY) {
                    scroller.refresh();
                }
            }
        },
        saveFocusState: function() {
            var me = this,
                navModel = me.getNavigationModel(),
                location = navModel.location,
                lastFocusedViewIndex, lastFocusedRecord, itemCount, focusItem;
            if (location) {
                lastFocusedRecord = location.record;
                lastFocusedViewIndex = location.viewIndex;
                return function() {
                    itemCount = me.getFastItems().length;
                    if (itemCount) {
                        if (lastFocusedRecord) {
                            focusItem = me.mapToItem(lastFocusedRecord);
                        }
                        if (!focusItem) {
                            focusItem = me.mapToItem(Math.min(lastFocusedViewIndex || 0, itemCount - 1));
                        }
                        navModel.setLocation(null);
                        navModel.setLocation(focusItem);
                    }
                };
            }
            return Ext.emptyFn;
        },
        setItemHidden: function(item, hide) {
            if (hide) {
                if (!item.$hidden) {
                    item.hide();
                    item.$hidden = true;
                }
            } else if (item.$hidden) {
                item.$hidden = false;
                item.show();
            }
        },
        setItemSelection: function(records, selected) {
            records = Ext.Array.from(records);
            var me = this,
                len = records.length,
                pressedCls = me.pressedCls,
                selectedCls = me.selectedCls,
                toRemove = pressedCls,
                i, record, item, toAdd;
            if (!selected) {
                toRemove = [
                    pressedCls,
                    selectedCls
                ];
            } else {
                toAdd = selectedCls;
            }
            if (!me.isConfiguring && !me.destroyed) {
                for (i = 0; i < len; i++) {
                    record = records[i];
                    item = me.itemFromRecord(record);
                    if (item) {
                        item = item.isWidget ? item.element : Ext.fly(item);
                        item.removeCls(toRemove);
                        if (toAdd) {
                            item.addCls(toAdd);
                        }
                    }
                }
            }
        },
        shouldRippleItem: function(item, e) {
            var disableSelection = this.getDisableSelection();
            if (!disableSelection && this.isItemSelected(item)) {
                return false;
            }
            return this.mixins.itemrippler.shouldRippleItem.call(this, item, e);
        },
        syncEmptyState: function() {
            var me = this,
                store = me.store,
                empty = !store || !store.getCount() && me.getEmptyText(),
                emptyTextCmp = me.emptyTextCmp;
            if (!empty) {
                if (emptyTextCmp) {
                    emptyTextCmp.hide();
                }
            } else if ((me.hasLoadedStore || !me.getDeferEmptyText()) && !(store && store.hasPendingLoad())) {
                emptyTextCmp = emptyTextCmp || me.getEmptyTextCmp();
                emptyTextCmp.show();
            }
            me.setEmptyState(empty);
            return empty;
        },
        toggleChildrenTabbability: function(enableTabbing) {
            var focusEl = this.getRenderTarget();
            if (enableTabbing) {
                focusEl.restoreTabbableState({
                    skipSelf: true
                });
            } else {
                focusEl.saveTabbableState({
                    skipSelf: true,
                    includeSaved: false
                });
            }
        },
        toggleHoverCls: function(on) {
            var target = this.mouseOverItem;
            if (target && !target.destroyed) {
                target.toggleCls(this.hoveredCls, on);
            }
        },
        _onChildEvent: function(fn, e) {
            var me = this,
                last = me.lastPressedLocation,
                location = me.createLocation(e);
            if (location.child) {
                location.pressing = !!(last && last.child === location.child);
                me[fn](location);
            }
            return location;
        },
        _onChildTouchStart: function(e) {
            var child = this._onChildEvent('onChildTouchStart', e).child,
                el = child && (child.element || Ext.get(child));
            if (el) {
                el.on('touchmove', '_onChildTouchMove', this);
            }
        },
        _onChildTouchMove: function(e) {
            this._onChildEvent('onChildTouchMove', e);
        },
        _onChildTouchEnd: function(e) {
            var child = this._onChildEvent('onChildTouchEnd', e).child,
                el = child && (child.element || Ext.get(child));
            if (el) {
                el.un('touchmove', '_onChildTouchMove', this);
            }
        },
        _onChildTouchCancel: function(e) {
            var child = this._onChildEvent('onChildTouchCancel', e).child,
                el = child && (child.element || Ext.get(child));
            if (el) {
                el.un('touchmove', '_onChildTouchMove', this);
            }
        },
        _onChildTap: function(e) {
            var target = e.getTarget('.' + Ext.baseCSSPrefix + 'item-no-tap', this.element);
            if (!target) {
                this._onChildEvent('onChildTap', e);
            }
        },
        _onChildTapCancel: function(e) {
            this._onChildEvent('onChildTapCancel', e);
        },
        _onChildContextMenu: function(e) {
            this._onChildEvent('onChildContextMenu', e);
        },
        _onChildLongPress: function(e) {
            this._onChildEvent('onChildLongPress', e);
        },
        _onChildTapHold: function(e) {
            this._onChildEvent('onChildTapHold', e);
        },
        _onChildSingleTap: function(e) {
            this._onChildEvent('onChildSingleTap', e);
        },
        _onChildDoubleTap: function(e) {
            this._onChildEvent('onChildDoubleTap', e);
        },
        _onChildSwipe: function(e) {
            this._onChildEvent('onChildSwipe', e);
        },
        _onChildMouseOver: function(e) {
            var fromItem = e.getRelatedTarget(this.itemSelector),
                toItem = e.getTarget(this.itemSelector);
            if (toItem !== fromItem) {
                this._onChildEvent('onChildMouseOver', e);
            }
        },
        _onChildMouseOut: function(e) {
            var toItem = e.getRelatedTarget(this.itemSelector),
                fromItem = e.getTarget(this.itemSelector);
            if (toItem !== fromItem || !e.getRelatedTarget(this.eventDelegate)) {
                this._onChildEvent('onChildMouseOut', e);
            }
        },
        _onContainerTouchStart: function(e) {
            var me = this,
                isWithinScrollbar;
            if (e.getTarget(me.scrollbarSelector)) {
                e.preventDefault();
                isWithinScrollbar = true;
            } else if (!e.getTarget(me.itemSelector)) {
                e.preventDefault();
                if (!me.bodyElement.getClientRegion().contains(e.getPoint())) {
                    isWithinScrollbar = true;
                }
            }
            if (isWithinScrollbar) {
                me.getNavigationModel().lastLocation = 'scrollbar';
            }
        },
        setupChildEvent: Ext.privateFn,
        updateEmptyState: function(empty) {
            var me = this,
                items = me.items.items,
                showInEmptyState, hide, i, item, show;
            for (i = 0; i < items.length; ++i) {
                item = items[i];
                showInEmptyState = item.showInEmptyState;
                hide = show = false;
                if (showInEmptyState === false) {
                    hide = !(show = !empty);
                } else if (showInEmptyState) {
                    if (typeof showInEmptyState === 'function') {
                        hide = !(show = item.showInEmptyState(empty));
                        if (show == null) {
                            
                            continue;
                        }
                    } else {
                        hide = !(show = empty);
                    }
                }
                if (hide) {
                    if (item.isInner) {
                        me.setItemHidden(item, true);
                    } else {
                        item.hide();
                    }
                } else if (show) {
                    if (item.isInner) {
                        me.setItemHidden(item, false);
                    } else {
                        item.show();
                    }
                }
            }
        },
        applyNavigationModel: function(navigationModel) {
            if (navigationModel) {
                if (typeof navigationModel === 'string') {
                    navigationModel = {
                        type: navigationModel
                    };
                }
                navigationModel = Ext.Factory.navmodel(Ext.apply({
                    view: this
                }, navigationModel));
            }
            return navigationModel;
        },
        updateNavigationModel: function(navigationModel, oldNavigationModel) {
            Ext.destroy(oldNavigationModel);
        },
        getUseComponents: function() {
            return this.isComponentDataView;
        }
    }
});

Ext.define('Ext.dataview.GenericItem', {
    mixinId: 'dataviewitem',
    isDataViewItem: true,
    config: {
        innerCls: null,
        contentCls: null,
        recordIndex: null
    },
    updateRecordIndex: function(value) {
        this.el.dom.setAttribute('data-recordindex', value);
    },
    getDataview: function() {
        return this.parent;
    },
    updateInnerCls: function(cls, old) {
        this.innerElement.replaceCls(old, cls);
    },
    updateContentCls: function(cls, old) {
        this.getInnerHtmlElement().replaceCls(old, cls);
    },
    privates: {
        $dirty: false,
        dirtyCls: Ext.baseCSSPrefix + 'dirty',
        augmentToolHandler: function(tool, args) {
            var me = this;
            args[1] = {
                event: args.pop(),
                item: me,
                list: me.parent,
                record: me.getRecord(),
                tool: args[1]
            };
        },
        handleEmptyText: function(html) {
            var parent;
            if (!html) {
                parent = this.parent;
                if (parent && parent.getEmptyItemText) {
                    html = parent.getEmptyItemText();
                }
            }
            return html;
        },
        syncDirty: function(record) {
            var me = this,
                dirty = record ? record.dirty : false;
            if (dirty !== me.$dirty) {
                me.toggleCls(me.dirtyCls, dirty);
                me.$dirty = dirty;
            }
        }
    }
});

Ext.define('Ext.dataview.DataItem', function(DataItem) {
    return {
        extend: Ext.Container,
        alternateClassName: 'Ext.dataview.component.DataItem',
        xtype: 'dataitem',
        mixins: [
            Ext.dataview.GenericItem
        ],
        config: {
            itemCls: null,
            dataMap: {
                cached: true,
                $value: null
            }
        },
        html: '\xa0',
        classCls: Ext.baseCSSPrefix + 'dataitem',
        inheritUi: true,
        autoSize: null,
        defaultType: 'component',
        referenceHolder: true,
        template: [
            {
                reference: 'bodyElement',
                cls: Ext.baseCSSPrefix + 'body-el',
                uiCls: 'body-el',
                children: [
                    {
                        reference: 'innerElement',
                        cls: Ext.baseCSSPrefix + 'inner-el',
                        uiCls: 'inner-el'
                    }
                ]
            }
        ],
        updateItemCls: function(newCls, oldCls) {
            this.el.replaceCls(oldCls, newCls);
        },
        updateRecord: function(record) {
            var me = this,
                dataMap, tpl, data, viewModel;
            if (me.destroying) {
                return;
            }
            viewModel = me.getViewModel();
            if (viewModel) {
                viewModel.setData({
                    record: record
                });
            }
            dataMap = me.getDataMap();
            tpl = me.getTpl();
            if (dataMap) {
                DataItem.executeDataMap(record, me, dataMap);
            }
            me.syncDirty(record);
            if (tpl || !dataMap || me.hasListeners.updatedata) {
                data = me.parent.gatherData(record);
                if (tpl) {
                    me.updateData(data);
                }
                if (me.hasListeners.updatedata) {
                    me.fireEvent('updatedata', me, data);
                }
            }
        },
        updateHtml: function(html, oldHtml) {
            this.callParent([
                this.handleEmptyText(html),
                oldHtml
            ]);
        },
        privates: {
            applyDataMap: function(dataMap) {
                return DataItem.parseDataMap(dataMap);
            },
            getRenderTarget: function() {
                return this.innerElement;
            },
            statics: {
                assignDataToItem: function(record, target, mappings, legacy) {
                    var configMap = Ext.Config.map,
                        cfg, dataPath, i, n, name, s, value;
                    for (name in mappings) {
                        s = legacy ? name : ((cfg = configMap[name]) && cfg.names.set);
                        if (!target[s]) {
                            if (legacy) {
                                Ext.raise('No method "' + name + '" on ' + target.$className);
                            } else {
                                Ext.raise('No config "' + name + '" on ' + target.$className);
                            }
                            
                            continue;
                        }
                        dataPath = mappings[name];
                        value = record;
                        for (i = 0 , n = dataPath.length; value && i < n; ++i) {
                            value = value.interpret(dataPath[i]);
                        }
                        target[s]((i < n) ? null : value);
                    }
                },
                executeDataMap: function(record, item, dataMap) {
                    var reference, legacy, target, mappings;
                    for (reference in dataMap) {
                        if (!(mappings = dataMap[reference])) {
                            
                            continue;
                        }
                        legacy = false;
                        if (!(target = (reference === '#') ? item : item.lookup(reference))) {
                            if (typeof item[reference] === 'function') {
                                target = item[reference]();
                                legacy = true;
                                if (!item.$dataMapWarning) {
                                    item.$dataMapWarning = true;
                                    Ext.log.warn('Using getters in dataMaps is deprecated (for ' + item.getId() + '); support will be removed in 7.0');
                                }
                            }
                            if (!target) {
                                
                                continue;
                            }
                        }
                        DataItem.assignDataToItem(record, target, mappings, legacy);
                    }
                },
                parseDataMap: function(dataMap) {
                    var map = {},
                        inner, innerSrc, key1, key2;
                    for (key1 in dataMap) {
                        map[key1] = inner = {};
                        innerSrc = dataMap[key1];
                        for (key2 in innerSrc) {
                            inner[key2] = innerSrc[key2].split('.');
                        }
                    }
                    return map;
                }
            }
        }
    };
});

Ext.define('Ext.dataview.Component', {
    extend: Ext.dataview.Abstract,
    xtype: 'componentdataview',
    isComponentDataView: true,
    config: {
        itemInnerCls: null,
        itemConfig: {
            xtype: 'dataitem'
        },
        itemContentCls: null,
        itemDataMap: null,
        maxItemCache: 20,
        striped: null,
        itemCount: 0
    },
    firstCls: Ext.baseCSSPrefix + 'first',
    lastCls: Ext.baseCSSPrefix + 'last',
    oddCls: Ext.baseCSSPrefix + 'odd',
    beforeInitialize: function(config) {
        this.itemCache = {
            max: 0,
            unused: []
        };
        this.callParent([
            config
        ]);
    },
    isFirstItem: function(item) {
        return item === this.getFirstItem();
    },
    isFirstDataItem: function(item) {
        return item === this.getFirstDataItem();
    },
    isLastItem: function(item) {
        return item === this.getLastItem();
    },
    isLastDataItem: function(item) {
        return item === this.getLastDataItem();
    },
    doDestroy: function() {
        Ext.destroy(this.itemCache.unused, this.dataRange);
        this.callParent();
    },
    onRender: function() {
        var me = this,
            itemConfig = me.getItemConfig(),
            vm = itemConfig.viewModel;
        if (vm) {
            me.hasItemVm = true;
            itemConfig.viewModel = Ext.applyIf({
                scheduler: null
            }, vm);
            if (!me.lookupViewModel()) {
                me.setViewModel(true);
            }
        }
        me.callParent();
    },
    getViewItems: function() {
        return this.getInnerItems().slice();
    },
    onStoreAdd: function(store, records, index) {
        var me = this;
        me.callParent(arguments);
        me.setItemCount(store.getCount());
        me.syncItemRange(me.getStoreChangeSyncIndex(index));
    },
    onStoreRemove: function(store, records, index) {
        var me = this,
            len = records.length,
            dataItems = me.dataItems.splice(index, len),
            itemCount = me.getItemCount(),
            i;
        me.callParent(arguments);
        if (!dataItems.length) {
            return;
        }
        for (i = len; i-- > 0; ) {
            me.removeDataItem(dataItems[i]);
        }
        me.setItemCount(itemCount - len);
        me.syncItemRange(me.getStoreChangeSyncIndex(index));
    },
    updateItemInnerCls: function(cls) {
        if (!this.isConfiguring) {
            var items = this.dataItems,
                len = items.length,
                i, item;
            for (i = 0; i < len; i++) {
                item = items[i];
                if (item.setInnerCls) {
                    item.setInnerCls(cls);
                }
            }
        }
    },
    applyItemConfig: function(itemConfig, oldItemConfig) {
        itemConfig = itemConfig || {};
        if (oldItemConfig && !itemConfig.xtype && !itemConfig.xclass) {
            var xtype = oldItemConfig.xtype,
                xclass = oldItemConfig.xclass;
            if (xtype || xclass) {
                itemConfig = Ext.apply({}, itemConfig);
                itemConfig[xclass ? 'xclass' : 'xtype'] = xclass || xtype;
            }
        }
        return itemConfig;
    },
    updateItemConfig: function() {
        if (!this.isConfiguring) {
            this.clearItems();
            this.refresh();
        }
    },
    updateItemContentCls: function(cls) {
        if (!this.isConfiguring) {
            var items = this.dataItems,
                len = items.length,
                i, item;
            for (i = 0; i < len; i++) {
                item = items[i];
                if (item.setContentCls) {
                    item.setContentCls(cls);
                }
            }
        }
    },
    applyItemDataMap: function(dataMap) {
        return Ext.dataview.DataItem.parseDataMap(dataMap);
    },
    updateMaxItemCache: function(max) {
        this.itemCache.max = max;
    },
    updateStriped: function(striped) {
        var me = this,
            dataItems = me.dataItems,
            oddCls = me.oddCls,
            i, el, odd;
        me.striped = !!striped;
        if (!me.isConfiguring) {
            for (i = 0; i < dataItems.length; ++i) {
                el = dataItems[i].el;
                odd = striped ? +el.dom.getAttribute('data-recordindex') : 0;
                el.toggleCls(oddCls, odd % 2);
            }
        }
    },
    privates: {
        dataRange: null,
        infinite: false,
        striped: false,
        _itemChangeHandlers: [
            'changeItemRecordIndex',
            'changeItemRecord',
            'changeItemIsFirst',
            'changeItemIsLast'
        ],
        acquireItem: function(cfg, itemsFocusable) {
            var me = this,
                at = null,
                el, item;
            if (typeof cfg === 'number') {
                at = cfg;
                cfg = null;
            }
            if (!cfg) {
                cfg = me.getItemConfig();
                itemsFocusable = me.getItemsFocusable();
            }
            if (!(item = me.itemCache.unused.pop())) {
                item = me.createDataItem(cfg);
                item = me.addDataItem(item, at);
                el = item.element;
                if (itemsFocusable) {
                    (item.getFocusEl() || el).setTabIndex(-1);
                }
                el.dom.setAttribute('data-viewid', me.id);
            } else {
                item.removeCls(me._cachedRemoveClasses);
                me.addDataItem(item, at);
            }
            return item;
        },
        addDataItem: function(item, at) {
            var me = this;
            if (at === null) {
                at = me.findTailItem(false);
            }
            item = (at < 0) ? me.add(item) : me.insert(at, item);
            me.dataItems.push(item);
            return item;
        },
        changeItem: function(itemIndex, recordIndex) {
            var me = this,
                store = me.store,
                page = store.currentPage,
                datasetIndex = recordIndex + (page ? ((page - 1) * store.pageSize) : 0),
                dataItems = me.dataItems,
                realIndex = (itemIndex < 0) ? dataItems.length + itemIndex : itemIndex,
                record = me.dataRange.records[recordIndex],
                item = me.getItemForRecord(realIndex, record, recordIndex),
                storeCount = store.getCount(),
                handlers = me._itemChangeHandlers,
                options = {
                    isFirst: !recordIndex,
                    isLast: recordIndex === storeCount - 1,
                    item: item,
                    itemIndex: realIndex,
                    record: record,
                    recordIndex: recordIndex,
                    datasetIndex: datasetIndex
                },
                i, itemEl;
            options.afterEl = options.beforeEl = options.itemEl = itemEl = item.renderElement;
            options.itemClasses = itemEl.getClassMap(false);
            options.isFirstChanged = item.isFirst !== options.isFirst;
            options.isLastChanged = item.isLast !== options.isLast;
            for (i = 0; i < handlers.length; ++i) {
                me[handlers[i]](options);
            }
            itemEl.setClassMap(options.itemClasses, true);
            return options;
        },
        changeItemIsFirst: function(options) {
            if (!options.isFirstChanged) {
                return;
            }
            var me = this,
                firstCls = me.firstCls,
                item = options.item,
                itemClasses = options.itemClasses,
                items = me.scrollDockedItems,
                i, len;
            if (!(item.isFirst = options.isFirst)) {
                delete itemClasses[firstCls];
            } else {
                itemClasses[firstCls] = 1;
                if (items && !me.infinite) {
                    items = items.start.items;
                    len = items.length;
                    for (i = 0; i < len; ++i) {
                        items[i].renderElement.insertBefore(options.beforeEl);
                    }
                }
            }
        },
        changeItemIsLast: function(options) {
            if (!options.isLastChanged) {
                return;
            }
            var me = this,
                item = options.item,
                itemClasses = options.itemClasses,
                lastCls = me.lastCls,
                items = me.scrollDockedItems,
                i, len;
            if (!(item.isLast = options.isLast)) {
                delete itemClasses[lastCls];
            } else {
                itemClasses[lastCls] = 1;
                if (items && !me.infinite) {
                    items = items.end.items;
                    len = items.length;
                    for (i = 0; i < len; ++i) {
                        items[i].renderElement.insertAfter(options.afterEl);
                    }
                }
            }
        },
        changeItemRecord: function(options) {
            this.syncItemRecord(options);
        },
        changeItemRecordIndex: function(options) {
            var item = options.item,
                recordIndex = options.recordIndex,
                itemClasses = options.itemClasses,
                oddCls = this.oddCls;
            item.$datasetIndex = options.datasetIndex;
            if (item.isDataViewItem) {
                if (item.getRecordIndex() !== recordIndex) {
                    item.setRecordIndex(recordIndex);
                }
            } else {
                item.el.dom.setAttribute('data-recordindex', recordIndex);
            }
            if (this.striped && options.recordIndex % 2) {
                itemClasses[oddCls] = 1;
            } else {
                delete itemClasses[oddCls];
            }
        },
        clearItemCaches: function() {
            var cache = this.itemCache.unused;
            Ext.destroy(cache);
            cache.length = 0;
        },
        clearItems: function() {
            var me = this,
                dataItems = me.dataItems,
                len = dataItems.length,
                itemCache = me.itemCache.unused,
                i;
            for (i = 0; i < len; ++i) {
                me.removeDataItem(dataItems[i], true);
            }
            Ext.destroy(itemCache);
            dataItems.length = itemCache.length = 0;
            me.setItemCount(0);
        },
        createDataItem: function(cfg) {
            var me = this,
                cls, config;
            config = {
                xtype: me.getDefaultType(),
                tpl: me.getItemTpl(),
                $dataItem: 'record'
            };
            cls = me.getItemInnerCls();
            if (cls) {
                config.innerCls = cls;
            }
            cls = me.getItemContentCls();
            if (cls) {
                config.contentCls = cls;
            }
            config = Ext.apply(config, cfg || me.getItemConfig());
            config.cls = [
                config.cls,
                me.getMarkDirty() ? me.markDirtyCls : '',
                me.getItemCls()
            ].join(' ');
            return config;
        },
        doClear: function() {
            this.setItemCount(0);
            this.callParent();
        },
        doRefresh: function(scrollToTop) {
            var me = this,
                storeCount = me.dataRange.records.length,
                scroller = me.getScrollable(),
                restoreFocus;
            ++me.refreshCounter;
            if (scroller && scrollToTop) {
                scroller.scrollTo(0, 0);
            }
            if (storeCount) {
                restoreFocus = me.saveFocusState();
                me.hideEmptyText();
                me.setItemCount(storeCount);
                me.syncItemRange();
                if (me.hasSelection()) {
                    me.setItemSelection(me.getSelections(), true);
                }
                restoreFocus();
            } else {
                me.doClear();
            }
        },
        getCacheForItem: function() {
            return this.itemCache;
        },
        getFastItems: function() {
            return this.getInnerItems();
        },
        getItemForRecord: function(viewIndex) {
            return this.dataItems[viewIndex];
        },
        getStoreChangeSyncIndex: function(index) {
            return index;
        },
        removeCachedItem: function(item, preventCache, cache, preventRemoval) {
            var me = this,
                ret = false,
                unused = !preventCache && cache && cache.unused;
            if (unused && unused.length < cache.max) {
                if (preventRemoval) {
                    me.setItemHidden(item, true);
                } else {
                    me.remove(item, false);
                }
                unused.push(item);
            } else {
                item.destroy();
                ret = true;
            }
            return ret;
        },
        removeDataItem: function(item, preventCache) {
            return this.removeCachedItem(item, preventCache, !preventCache && this.getCacheForItem(item));
        },
        syncItemRange: function(start, end) {
            var count = this.store.getCount(),
                i;
            if (end == null) {
                end = count;
            }
            for (i = start || 0; i < end; ++i) {
                this.changeItem(i, i);
            }
        },
        syncItemRecord: function(options, tombstoneRec) {
            var me = this,
                item = options.item,
                itemClasses = options && options.itemClasses,
                oldRecord = item.getRecord(),
                record = tombstoneRec || options.record,
                dataMap = me.getItemDataMap(),
                el = item.el,
                viewModel = item.getViewModel(),
                selectedCls = me.selectedCls;
            if (oldRecord === record) {
                if (!tombstoneRec) {
                    if (item.isRecordRefreshable) {
                        item.refresh(options);
                    } else {
                        item.updateRecord(record, oldRecord);
                    }
                }
            } else {
                if (me.getSelectable().isRowSelected(record)) {
                    if (itemClasses) {
                        itemClasses[selectedCls] = true;
                    } else {
                        el.addCls(selectedCls);
                    }
                } else if (itemClasses) {
                    delete itemClasses[selectedCls];
                } else {
                    el.removeCls(selectedCls);
                }
                item.setRecord(record);
                item.el.dom.setAttribute('data-recordid', record.internalId);
                if (item.isDragging) {
                    if (item.draggingRecordId === record.id) {
                        itemClasses[item.dragMarkerCls] = true;
                    } else {
                        delete itemClasses[item.dragMarkerCls];
                    }
                }
            }
            if (dataMap) {
                Ext.dataview.DataItem.executeDataMap(record, item, dataMap);
            }
            if (viewModel) {
                viewModel.setData({
                    record: options.record
                });
            }
        },
        traverseItem: function(item, delta) {
            var me = this,
                items = me.innerItems,
                next = null,
                cmp = item,
                i;
            if (item) {
                if (item.isElement) {
                    cmp = Ext.getCmp(item.id);
                }
                i = items.indexOf(cmp);
                if (i > -1) {
                    next = items[i + delta] || null;
                }
            }
            return next;
        },
        updateItemCount: function(count) {
            var me = this,
                items = me.dataItems,
                cfg, itemsFocusable;
            if (items.length < count) {
                cfg = me.getItemConfig();
                itemsFocusable = me.getItemsFocusable();
                while (items.length < count) {
                    me.acquireItem(cfg, itemsFocusable);
                }
            }
            while (items.length > count) {
                me.removeDataItem(items.pop());
            }
        }
    }
}, function(ComponentDataView) {
    var proto = ComponentDataView.prototype;
    proto._cachedRemoveClasses = [
        proto.pressedCls,
        proto.selectedCls
    ];
});

Ext.define('Ext.dataview.GroupStore', {
    extend: Ext.data.ChainedStore,
    isGroupStore: true,
    syncSourceGrouping: true,
    applyGrouper: function(grouper, oldGrouper) {
        var me = this,
            source = me.getSource(),
            ret;
        if (source && grouper !== source.getGrouper()) {
            source.setGrouper(grouper);
            grouper = source.getGrouper();
        }
        ret = me.callParent([
            grouper,
            oldGrouper
        ]);
        me.refreshFromSource();
        return ret;
    },
    constructDataCollection: function() {
        var me = this,
            collection = me.callParent();
        collection.transformItems = function(items) {
            return me.transformItems(collection, items);
        };
        return collection;
    },
    createFiltersCollection: function() {
        return this.getSource().getFilters();
    },
    refreshFromSource: function() {
        var data = this.getData(),
            list = this.list,
            was = list.getScrollToTopOnRefresh();
        list.setScrollToTopOnRefresh(false);
        data.onCollectionRefresh(data.getSource());
        list.setScrollToTopOnRefresh(was);
    },
    transformItems: function(collection, records) {
        var me = this,
            n = records.length,
            list = me.list,
            collapser = list.isGrouping() && list.getCollapsible(),
            ret = records,
            groupMap = {},
            source = me.getSource(),
            M = source.getModel(),
            groupField = collapser && source.getGrouper().getProperty(),
            collapsed, copy, group, groupKey, i, placeholder, rec, sourceGroups, srcGroup, startCollapsed;
        if (collapser) {
            sourceGroups = collection.getSource().getGroups();
            startCollapsed = collapser.getCollapsed();
            for (i = 0; i < n; ++i) {
                rec = records[i];
                srcGroup = sourceGroups.getItemGroup(rec);
                group = list.groupFrom(groupKey = srcGroup.getGroupKey());
                collapsed = group ? group.collapsed : startCollapsed;
                if (collapsed) {
                    if (!copy) {
                        copy = ret = records.slice(0, i);
                    }
                    if (!groupMap[groupKey]) {
                        if (!(placeholder = srcGroup.placeholderRec)) {
                            srcGroup.placeholderRec = placeholder = new M();
                            placeholder.data[groupField] = placeholder.$groupKey = groupKey;
                            placeholder.$collapsedGroupPlaceholder = true;
                            placeholder.$srcGroup = srcGroup;
                        }
                        groupMap[groupKey] = placeholder;
                        copy.push(placeholder);
                    }
                } else if (copy) {
                    copy.push(rec);
                }
            }
        }
        return ret;
    },
    updateSource: function(source, oldSource) {
        var me = this;
        if (source) {
            me.list.store = me;
        }
        if (oldSource && oldSource.getAutoDestroy()) {
            oldSource.destroy();
        }
        me.callParent([
            source,
            oldSource
        ]);
        if (source && !me.destroying) {
            me.getSorters().setSource(source.getSorters());
        }
    }
});

Ext.define('Ext.dataview.Pinnable', {
    mixinId: 'dataviewpinnable',
    isDataViewPinnable: true,
    config: {
        pinned: null
    },
    pinnedCls: Ext.baseCSSPrefix + 'pinned',
    updatePinned: function(value) {
        var me = this,
            el = me.el,
            pinnedCls = me.pinnedCls,
            pinnedClsMap = me._pinnedClsMap,
            classes = el.getClassMap(false);
        delete classes[pinnedClsMap.top];
        delete classes[pinnedClsMap.bottom];
        if (value) {
            classes[pinnedCls] = true;
            pinnedCls = pinnedClsMap[value];
            if (pinnedCls) {
                classes[pinnedCls] = true;
            }
        } else {
            delete classes[pinnedCls];
        }
        el.setClassMap(classes, true);
    },
    _pinnedClsMap: {
        top: Ext.baseCSSPrefix + 'pinned-top',
        bottom: Ext.baseCSSPrefix + 'pinned-bottom'
    }
});

Ext.define('Ext.dataview.ItemHeader', {
    extend: Ext.Component,
    xtype: 'itemheader',
    mixins: [
        Ext.mixin.Toolable,
        Ext.dataview.Pinnable
    ],
    isItemHeader: true,
    config: {
        group: null,
        contentWidth: null
    },
    html: '\xa0',
    classCls: Ext.baseCSSPrefix + 'itemheader',
    inheritUi: true,
    toolDefaults: {
        ui: 'itemheader'
    },
    template: [
        {
            reference: 'bodyElement',
            cls: Ext.baseCSSPrefix + 'body-el',
            uiCls: 'body-el'
        }
    ],
    setGroup: function(group) {
        var me = this,
            was = me._group;
        me._group = group;
        me.updateGroup(group, was);
        return me;
    },
    updateGroup: function(group, oldGroup) {
        var me = this,
            data, grouper, html, list, tpl;
        if (oldGroup && group !== oldGroup && oldGroup.getHeader() === me) {
            oldGroup.setHeader(null);
        }
        if (group) {
            group.setHeader(me);
            list = me.parent;
            grouper = list.getStore().getGrouper();
            tpl = (grouper && grouper.owner === list && grouper.headerTpl) || me.getTpl();
            if (tpl) {
                data = me.getGroupHeaderTplData();
                html = tpl.apply(data);
            }
        }
        me.setHtml(html || '\xa0');
    },
    getScrollerTarget: function() {
        return this.el;
    },
    doDestroy: function() {
        this.mixins.toolable.doDestroy.call(this);
        this.callParent();
    },
    privates: {
        augmentToolHandler: function(tool, args) {
            var info = args[1] = {
                    event: args.pop(),
                    group: this.getGroup(),
                    itemHeader: args[0],
                    tool: args[1]
                };
            args[0] = info.list = this.parent;
        },
        getGroupHeaderTplData: function(skipHtml) {
            var group = this.getGroup(),
                list = this.parent,
                collection = group && group.data,
                data = collection && {
                    name: collection.getGroupKey(),
                    group: group,
                    groupField: list.getStore().getGrouper().getProperty(),
                    children: collection.items,
                    count: collection.length
                };
            if (data) {
                data.value = collection.items[0].data[data.groupField];
            }
            if (!skipHtml) {
                data.html = Ext.htmlEncode(data.name);
            }
            data.groupValue = data.value;
            return data;
        },
        getList: function() {
            return this.parent;
        },
        onToggleCollapse: function() {
            this.getGroup().toggleCollapsed();
        },
        updateContentWidth: function(width) {
            var el = this._toolDockWrap || this.bodyElement;
            if (el) {
                el.setWidth(width ? width : null);
            }
        }
    }
});

Ext.define('Ext.dataview.ListCollapser', {
    isListCollapser: true,
    config: {
        collapsed: null,
        collapseToolText: 'Collapse this group',
        expandToolText: 'Expand this group',
        footer: false,
        tool: {
            xtype: 'tool',
            type: 'collapse',
            handler: 'up.onToggleCollapse',
            itemId: 'groupCollapser',
            weight: 900,
            zone: 'end'
        }
    },
    collapsedCls: Ext.baseCSSPrefix + 'group-collapsed',
    list: null,
    constructor: function(config) {
        this.initConfig(config);
    },
    privates: {
        isRecordRendered: function(recordOrIndex) {
            var list = this.list,
                group = list.groupFrom(recordOrIndex);
            return !(group && group.collapsed) && list.isRecordRendered(recordOrIndex);
        }
    }
});

Ext.define('Ext.dataview.ListGroup', {
    $configPrefixed: false,
    config: {
        collapsed: null,
        collapsible: null,
        header: null
    },
    data: null,
    list: null,
    beginIndex: -1,
    endIndex: -1,
    nextGroup: null,
    previousGroup: null,
    constructor: function(config) {
        this.initConfig(config);
    },
    collapse: function() {
        this.toggleCollapsed(true);
    },
    expand: function() {
        this.toggleCollapsed(false);
    },
    getCollapseTool: function() {
        var header = this.peekHeader();
        return header && header.lookupTool('groupCollapser');
    },
    isAttached: function() {
        var me = this,
            data = me.data,
            list = me.list,
            group = list.store.getGroups(),
            expected;
        group = group.get(data.getGroupKey());
        expected = Ext.getExpando(group, list.expandoKey);
        return expected === me;
    },
    toggleCollapsed: function(collapsed) {
        var me = this,
            list = me.list,
            event;
        if (me.getCollapsible() !== false && me.isAttached()) {
            if (collapsed == null) {
                collapsed = !me.getCollapsed();
            }
            event = 'beforegroup' + (collapsed ? 'collapse' : 'expand');
            if (list.fireEvent(event, list, me) !== false) {
                me.setCollapsed(collapsed);
            }
        }
    },
    applyCollapsed: function(collapsed) {
        return !!collapsed;
    },
    updateCollapsed: function(collapsed, oldCollapsed) {
        var me = this,
            list = me.list,
            collapser = list.getCollapsible(),
            tool = me.getCollapseTool(),
            header = me.peekHeader();
        if (me.isAttached()) {
            if (tool) {
                tool.setType(collapsed ? 'expand' : 'collapse');
                tool.setTooltip(collapsed ? collapser.getExpandToolText() : collapser.getCollapseToolText());
            }
            if (header) {
                header.el.toggleCls(collapser.collapsedCls, collapsed);
            }
            if (collapsed !== !!oldCollapsed) {
                list.syncGroupCollapse(me, collapsed);
            }
        }
    },
    updateHeader: function(header) {
        if (header) {
            var me = this,
                collapsible = me.list.getCollapsible(),
                collapsed = me.getCollapsed();
            if (collapsible) {
                if (!me.getCollapseTool()) {
                    header.addTool(collapsible.getTool());
                }
                if (collapsed === !!collapsed) {
                    me.updateCollapsed(collapsed, collapsed);
                } else {
                    me.setCollapsed(!!collapsed);
                }
            }
        }
    },
    peekHeader: function() {
        var me = this,
            header = me.getHeader();
        if (header && (header.destroying || !me.isAttached())) {
            me.setHeader(header = null);
        }
        return header;
    }
}, function(ListGroup) {
    var target = ListGroup.prototype;
    Ext.each([
        'contains',
        'containsAll',
        'containsKey',
        'each',
        'eachKey',
        'find',
        'findBy',
        'findIndex',
        'findIndexBy',
        'first',
        'last',
        'get',
        'getAt',
        'getByKey',
        'getCount',
        'getRange',
        'getValues',
        'indexOf',
        'indexOfKey',
        'getSummaryRecord'
    ], function(name) {
        target[name] = function() {
            var data = this.data;
            return data && data[name].apply(data, arguments);
        };
    });
});

Ext.define('Ext.dataview.Disclosable', {
    mixinId: 'disclosable',
    isListItem: true,
    toolDefaults: {
        ui: 'listitem'
    },
    toolAnchorName: 'innerElement',
    getDisclosure: function() {
        return this.lookupTool('disclosure');
    },
    privates: {
        invokeDisclosure: function(tool, handler, e) {
            var parent = this.parent;
            if (tool.type === 'disclosure' && !handler) {
                if (parent && parent.onItemDisclosureTap) {
                    parent.onItemDisclosureTap(this, e);
                    return true;
                }
            }
        },
        syncDisclosure: function(record) {
            var me = this,
                disclosure = me.getDisclosure(),
                parent = me.parent;
            if (disclosure) {
                disclosure.setHidden(parent.shouldHideDisclosure(record));
            }
        }
    }
});

Ext.define('Ext.dataview.SimpleListItem', {
    extend: Ext.Component,
    alternateClassName: 'Ext.dataview.component.SimpleListItem',
    xtype: 'simplelistitem',
    mixins: [
        Ext.dataview.Disclosable,
        Ext.mixin.Toolable,
        Ext.dataview.GenericItem,
        Ext.dataview.Pinnable
    ],
    classCls: Ext.baseCSSPrefix + 'listitem',
    inheritUi: true,
    html: '\xa0',
    template: [
        {
            reference: 'bodyElement',
            cls: Ext.baseCSSPrefix + 'body-el',
            uiCls: 'body-el',
            children: [
                {
                    reference: 'innerElement',
                    cls: Ext.baseCSSPrefix + 'inner-el',
                    uiCls: 'inner-el'
                }
            ]
        }
    ],
    doDestroy: function() {
        this.mixins.toolable.doDestroy.call(this);
        this.callParent();
    },
    handleFocusEvent: Ext.emptyFn,
    updateRecord: function(record) {
        var me = this,
            dataview, data;
        if (me.destroying || me.destroyed) {
            return;
        }
        dataview = me.parent;
        data = dataview && dataview.gatherData(record);
        me.updateData(data);
        me.syncDisclosure(record);
    },
    updateHtml: function(html, oldHtml) {
        this.callParent([
            this.handleEmptyText(html),
            oldHtml
        ]);
    },
    privates: {
        getRenderTarget: function() {
            return this.innerElement;
        },
        invokeToolHandler: function(tool, handler, scope, args, e) {
            if (this.invokeDisclosure(tool, handler, e)) {
                return false;
            }
            return tool.invokeToolHandler(tool, handler, scope, args, e);
        }
    }
});

Ext.define('Ext.dataview.ListItemPlaceholder', {
    extend: Ext.dataview.SimpleListItem,
    xtype: 'listitemplaceholder',
    isListItemPlaceholder: true,
    config: {
        group: null
    },
    html: '',
    cls: Ext.baseCSSPrefix + 'listitem-placeholder'
});

Ext.define('Ext.dataview.List', {
    extend: Ext.dataview.Component,
    alternateClassName: 'Ext.List',
    xtype: 'list',
    isList: true,
    mixins: [
        Ext.mixin.Bufferable
    ],
    config: {
        bufferSize: 20,
        collapseDefaults: {
            cached: true,
            $value: {
                xclass: 'Ext.dataview.ListCollapser'
            }
        },
        collapsible: {
            lazy: true,
            $value: true
        },
        disclosureProperty: 'disclosure',
        grouped: true,
        groupFooter: {
            cached: true,
            $value: null
        },
        groupHeader: {
            cached: true,
            $value: {
                xtype: 'itemheader',
                tpl: '{html} ({count})'
            }
        },
        groupPlaceholder: {
            cached: true,
            $value: {
                xtype: 'listitemplaceholder'
            }
        },
        indexBar: null,
        infinite: null,
        minimumBufferDistance: 5,
        onItemDisclosure: {
            $value: null,
            merge: function(value, oldValue, target) {
                var t = value && target && target.$isClass && typeof value;
                if (t === 'string' || t === 'function') {
                    return {
                        handler: value,
                        scope: 'self'
                    };
                }
                return value;
            }
        },
        pinFooters: false,
        pinHeaders: true,
        pinnedFooter: {
            lazy: true,
            $value: null
        },
        pinnedHeader: {
            lazy: true,
            $value: {
                xtype: 'itemheader'
            }
        },
        preventSelectionOnDisclose: true,
        preventSelectionOnTool: true,
        rowLines: null,
        useSimpleItems: null,
        variableHeights: null,
        grouping: null,
        horizontalOverflow: {
            evented: true,
            $value: null
        },
        innerCtHeight: null,
        innerWidth: null,
        pinnedFooterHeight: null,
        pinnedHeaderHeight: null,
        topRenderedIndex: null,
        verticalOverflow: null,
        visibleHeight: null,
        visibleLeft: null,
        visibleTop: null,
        visibleWidth: null
    },
    bufferableMethods: {
        syncVerticalOverflow: 1
    },
    classCls: Ext.baseCSSPrefix + 'list',
    itemConfig: {
        xtype: 'simplelistitem'
    },
    maintainChildNodes: false,
    placeholderHeight: null,
    rowHeight: 0,
    scrollable: {
        x: false,
        y: true
    },
    storeEventListeners: {
        groupchange: 'onStoreGroupChange',
        totalcountchange: 'onStoreTotalCountChange'
    },
    template: [
        {
            reference: 'bodyElement',
            cls: Ext.baseCSSPrefix + 'body-el',
            uiCls: 'body-el',
            children: [
                {
                    reference: 'outerCt',
                    className: Ext.baseCSSPrefix + 'list-outer-ct',
                    children: [
                        {
                            reference: 'innerCt',
                            className: Ext.baseCSSPrefix + 'list-inner-ct'
                        }
                    ]
                }
            ]
        }
    ],
    beforeInitialize: function(config) {
        var me = this,
            infinite = me.getInfinite();
        if (!infinite) {
            me.innerCt.on('resize', 'onInnerCtResize', me);
        }
        me.expandoKey = 'list-' + me.$iid;
        me.gapMap = {};
        if (!me.itemTranslationMethod) {
            me.itemTranslationMethod = Ext.supports.TranslateYCausesHorizontalScroll ? 'cssposition' : 'csstransform';
        }
        me.groupingInfo = {
            header: {
                config: me.getGroupHeader(),
                creator: 'createGroupHeader',
                name: '$header',
                offset: 0,
                max: 0,
                unused: []
            },
            footer: {
                config: me.getGroupFooter(),
                creator: 'createGroupFooter',
                name: '$footer',
                offset: 1,
                max: 0,
                unused: []
            },
            placeholder: {
                max: 0,
                unused: []
            }
        };
        me.bodyElement.on({
            resize: 'onBodyResize',
            scope: me
        });
        me.selfPartner = [
            me
        ];
        me.stickyItems = [];
        me.stickyItemsByRecordId = {};
        me.callParent([
            config
        ]);
    },
    doDestroy: function() {
        var me = this,
            groupingInfo = me.groupingInfo;
        Ext.destroy(me.resyncListener, groupingInfo.header.unused, groupingInfo.footer.unused, groupingInfo.placeholder.unused);
        me.callParent();
    },
    createIndexBar: function(config) {
        return Ext.apply({
            xtype: 'indexbar',
            $initParent: this,
            parent: this,
            hidden: true
        }, config);
    },
    createPinnedFooter: function(config) {
        var ret = this.createPinnedHeaderFooter(config);
        ret.bottom = 0;
        ret.pinned = 'bottom';
        return ret;
    },
    createPinnedHeader: function(config) {
        var me = this,
            groupedHeader = me.getGroupHeader(),
            ret = me.createPinnedHeaderFooter(config),
            tools;
        ret.top = 0;
        ret.pinned = 'top';
        if (!ret.tpl && groupedHeader.tpl) {
            ret.tpl = groupedHeader.tpl;
        }
        if (!('tools' in ret)) {
            tools = groupedHeader && groupedHeader.tools;
            if (tools) {
                ret.tools = tools;
            }
        }
        return ret;
    },
    groupFrom: function(key) {
        var me = this,
            store = me.isGrouping() && me.store,
            group = null,
            expandoKey = me.expandoKey,
            ret = null,
            collapser, groups;
        if (store) {
            groups = store.getGroups();
            if (key.isGroup) {
                key = key.getGroupKey();
            } else if (key.isModel) {
                key = groups.getGrouper().getGroupString(key);
            }
            group = groups.get(key);
            if (group) {
                if (!(ret = Ext.getExpando(group, expandoKey))) {
                    if (store.isGroupStore) {
                        groups = store.getSource().getGroups();
                    }
                    ret = {
                        data: groups.get(key),
                        list: me
                    };
                    collapser = me.getCollapsible();
                    if (collapser) {
                        ret.collapsed = collapser.getCollapsed();
                    }
                    ret = new Ext.dataview.ListGroup(ret);
                    Ext.setExpando(group, expandoKey, ret);
                }
            }
        }
        return ret;
    },
    isGrouping: function() {
        var me = this,
            store = me.getGrouped() && me.store,
            grouper = store && store.getGrouper(),
            grouping = !!grouper;
        me.setGrouping(grouping);
        return grouping;
    },
    isRecordRendered: function(recordOrIndex) {
        var me = this,
            renderInfo = me.renderInfo;
        if (!me.infinite) {
            return true;
        }
        if (recordOrIndex.isEntity) {
            recordOrIndex = me.store.indexOf(recordOrIndex);
        }
        return recordOrIndex >= renderInfo.indexTop && recordOrIndex < renderInfo.indexBottom;
    },
    mapToViewIndex: function(value) {
        var me = this,
            indexOffset;
        if (me.infinite && typeof value === 'number') {
            indexOffset = me.renderInfo.indexTop;
            value -= indexOffset;
        }
        return me.callParent([
            value,
            indexOffset
        ]);
    },
    scrollToRecord: function(record, animation) {
        return this.ensureVisible({
            record: record,
            animation: animation
        });
    },
    shouldSelectItem: function(e) {
        var me = this,
            no = !me.callParent([
                e
            ]),
            cmp;
        if (!no) {
            cmp = e.getTarget(me.toolSelector);
            cmp = cmp && me.el.contains(cmp) && Ext.Component.from(cmp);
            if (cmp) {
                no = cmp.preventSelection;
                if (no == null) {
                    if (cmp.type === 'disclosure') {
                        no = me.getPreventSelectionOnDisclose();
                    } else {
                        no = me.getPreventSelectionOnTool();
                    }
                }
            }
        }
        return !no;
    },
    onBodyResize: function(el, info) {
        var me = this,
            height = info.height,
            width = info.width;
        if (width === me.getVisibleWidth()) {
            me.setVisibleHeight(height);
        } else {
            me.suspendSync = true;
            me.setVisibleHeight(me.outerCt.measure('h'));
            me.suspendSync = false;
            me.setVisibleWidth(width);
            me.refreshScrollerSize();
        }
    },
    onItemAdd: function(item, index) {
        var me = this;
        if (me.infinite) {
            if (item.$dataItem && me.variableHeights) {
                item.on('resize', 'onDataItemResize', me);
            }
            if (item.isInner) {
                item.setTranslatable({
                    type: me.itemTranslationMethod
                });
            }
        }
        return me.callParent([
            item,
            index
        ]);
    },
    onItemRemove: function(item, index, destroying) {
        var me = this,
            height = item.$height,
            scrollDock = item.scrollDock;
        me.callParent([
            item,
            index,
            destroying
        ]);
        if (scrollDock && height) {
            Ext.Array.remove(me.scrollDockedItems[scrollDock].items, item);
            me.adjustScrollDockHeight(scrollDock, -height);
        }
    },
    onStoreAdd: function(store, records, index) {
        var me = this;
        me.syncEmptyState();
        if (me.infinite) {
            if (me.getVisibleHeight()) {
                me.refreshGrouping();
                me.resyncOnPaint();
            }
        } else {
            me.refreshGrouping();
            me.setItemCount(store.getCount());
            me.syncItemRange(Math.max(0, index - 1));
        }
    },
    onStoreRemove: function(store, records, index) {
        var me = this,
            navModel = me.getNavigationModel(),
            location;
        if (me.infinite) {
            if (me.getVisibleHeight()) {
                me.refreshGrouping();
                me.resyncOnPaint();
            }
            me.syncEmptyState();
        } else {
            me.refreshGrouping();
            me.callParent([
                store,
                records,
                index
            ]);
        }
        if (navModel.location) {
            location = navModel.location.refresh();
            navModel.setLocation(location);
        }
    },
    onStoreUpdate: function(store, record, type, modifiedFieldNames, info) {
        var me = this,
            partners = me.allPartners,
            len, i, h, p, item;
        if (info && info.groupChanged && me.isGrouping()) {
            me.refreshGrouping();
            me.syncRows();
        } else {
            me.callParent([
                store,
                record,
                type,
                modifiedFieldNames,
                info
            ]);
            if (me.partnerManager && me.isActivePartner()) {
                h = me.measurePartners(record);
                if (h !== null) {
                    for (i = 0 , len = partners.length; i < len; ++i) {
                        p = partners[i];
                        item = p.itemFromRecord(record);
                        p.handleItemResize(item, h, true);
                    }
                }
            }
        }
    },
    applyCollapsible: function(value) {
        var me = this,
            collapser = null,
            store = me.store;
        if (value && !(store && store.isVirtualStore)) {
            collapser = Ext.clone(me.getCollapseDefaults());
            if (value !== true) {
                collapser = Ext.merge(collapser, value);
            }
            collapser.list = me;
            collapser = Ext.create(collapser);
        }
        return collapser;
    },
    updateCollapsible: function(value) {},
    updateGrouped: function() {
        var me = this;
        if (me.initialized) {
            me.refreshGrouping();
            me.syncRows();
        }
    },
    updateGroupFooter: function(footer) {
        var groupingInfo = this.groupingInfo;
        if (groupingInfo) {
            groupingInfo.footer.config = footer;
        }
    },
    applyGroupHeader: function(header) {
        var tpl = header && header.tpl;
        if (tpl != null) {
            header = Ext.apply({}, header);
            header.tpl = Ext.XTemplate.get(tpl);
        }
        return header;
    },
    updateGroupHeader: function(header) {
        var groupingInfo = this.groupingInfo;
        if (groupingInfo) {
            groupingInfo.header.config = header;
        }
    },
    updateGrouping: function(grouping) {
        this.toggleCls(this.groupedCls, grouping);
    },
    applyIndexBar: function(config, existing) {
        return Ext.updateWidget(existing, config, this, 'createIndexBar');
    },
    updateIndexBar: function(indexBar) {
        if (indexBar) {
            this.add(indexBar);
        }
    },
    applyItemConfig: function(itemConfig, oldItemConfig) {
        var ret = this.callParent([
                itemConfig,
                oldItemConfig
            ]),
            disclosure, tools;
        if (this.getOnItemDisclosure()) {
            disclosure = {
                disclosure: true
            };
            tools = ret.tools;
            ret.tools = tools ? Ext.merge(disclosure, tools) : disclosure;
        }
        return ret;
    },
    updateInfinite: function(infinite) {
        var me = this;
        me.infinite = infinite;
        me.freezeConfig('infinite');
        if (infinite) {
            me.setItemHidden = me.setItemHiddenInfinite;
            me.el.addCls(me.infiniteCls);
            me.innerCt.addCls(me.infiniteCls);
            me.renderInfo = {
                atBegin: false,
                atEnd: false,
                bottom: 0,
                height: 0,
                top: 0,
                indexBottom: 0,
                indexTop: 0
            };
            me.getScrollable().on({
                scope: me,
                offsetychange: 'onOffsetChange',
                offsetxchange: 'onOffsetChange',
                scroll: 'onContainerScroll',
                scrollstart: 'onContainerScrollStart',
                scrollend: 'onContainerScrollEnd'
            });
        }
    },
    updateMaxItemCache: function(max, oldMax) {
        var info = this.groupingInfo;
        this.callParent([
            max,
            oldMax
        ]);
        info.header.max = info.footer.max = info.placeholder.max = max;
    },
    updatePinFooters: function(pinFooters) {
        var me = this,
            pinnedFooter = me.pinnedFooter;
        me.pinFooters = pinFooters;
        if (me.isConfiguring) {
            return;
        }
        if (me.setupFooterPinning()) {
            if (me.infinite) {
                me.syncPinnedFooter();
            }
        } else if (pinnedFooter) {
            me.setItemHidden(pinnedFooter, true);
        }
    },
    applyPinnedFooter: function(config, existing) {
        var me = this,
            ret = Ext.updateWidget(existing, config, me, 'createPinnedFooter'),
            index;
        if (!existing) {
            index = me.getIndexBar();
            if (index) {
                index = me.indexOf(index);
                me.insert(index, ret);
            } else {
                me.add(ret);
            }
            me.setItemHidden(ret, true);
        }
        return ret;
    },
    updatePinnedFooter: function(pinnedFooter) {
        var me = this;
        me.pinnedFooter = pinnedFooter;
        me.setupFooterPinning();
        if (pinnedFooter) {
            pinnedFooter.$pinnedFooter = true;
        }
    },
    updatePinHeaders: function(pinHeaders) {
        var me = this,
            pinnedHeader = me.pinnedHeader;
        me.pinHeaders = pinHeaders;
        if (me.isConfiguring) {
            return;
        }
        if (me.setupHeaderPinning()) {
            if (me.infinite) {
                me.syncPinnedHeader();
            }
        } else if (pinnedHeader) {
            me.setItemHidden(pinnedHeader, true);
        }
    },
    applyPinnedHeader: function(config, existing) {
        var me = this,
            ret = Ext.updateWidget(existing, config, me, 'createPinnedHeader');
        if (!existing && ret) {
            me.insert(0, ret);
            me.setItemHidden(ret, true);
        }
        return ret;
    },
    updatePinnedHeader: function(pinnedHeader) {
        var me = this;
        me.pinnedHeader = pinnedHeader;
        me.setupHeaderPinning();
        if (pinnedHeader) {
            pinnedHeader.$pinnedHeader = true;
        }
    },
    updateRowLines: function(rowLines) {
        this.innerCt.toggleCls(this.noRowLinesCls, rowLines === false);
    },
    createScrollable: function(defaults) {
        var scrollable = this.callParent([
                defaults
            ]);
        if (this.infinite) {
            scrollable = Ext.apply({
                type: 'virtual',
                innerElement: this.innerCt
            }, scrollable);
        }
        return scrollable;
    },
    applyStore: function(store, oldStore) {
        var me = this,
            ret = me.callParent([
                store,
                oldStore
            ]);
        if (ret) {
            if (ret.isVirtualStore) {
                me.setCollapsible(null);
            }
            else if (me.isGrouping() && me.getCollapsible()) {
                me.store = ret = new Ext.dataview.GroupStore({
                    autoDestroy: true,
                    list: me,
                    source: ret
                });
            }
        }
        return ret;
    },
    updateUseSimpleItems: function(useSimpleItems) {
        if (!this.self._updateUseSimpleItemsWarning) {
            this.self._updateUseSimpleItemsWarning = true;
            Ext.log.warn('The Ext.List#useSimpleItems config is deprecated; ' + 'use itemConfig.xtype instead');
        }
        var itemConfig = this.getItemConfig();
        itemConfig = Ext.applyIf({
            xtype: useSimpleItems ? 'simplelistitem' : 'listitem'
        }, itemConfig);
        this.setItemConfig(itemConfig);
    },
    updateVariableHeights: function(variableHeights) {
        this.variableHeights = variableHeights;
    },
    privates: {
        toolSelector: '.' + Ext.baseCSSPrefix + 'tool:not(.' + Ext.baseCSSPrefix + 'passive)',
        infiniteCls: Ext.baseCSSPrefix + 'infinite',
        groupFirstCls: Ext.baseCSSPrefix + 'group-first',
        groupLastCls: Ext.baseCSSPrefix + 'group-last',
        groupedCls: Ext.baseCSSPrefix + 'grouped',
        hasPinnedFooterCls: Ext.baseCSSPrefix + 'has-pinned-footer',
        hasPinnedHeaderCls: Ext.baseCSSPrefix + 'has-pinned-header',
        noRowLinesCls: Ext.baseCSSPrefix + 'no-row-lines',
        stickyCls: Ext.baseCSSPrefix + 'sticky',
        tombstoneCls: Ext.baseCSSPrefix + 'tombstone',
        blockingScroll: 0,
        gapAfter: 0,
        groupingInfo: null,
        heightSyncs: 0,
        manageHorizontalOverflow: true,
        pinnedFooter: null,
        pinnedHeader: null,
        lastAdjustedPosition: null,
        measuredHeight: null,
        renderInfo: null,
        suspendSync: false,
        onContainerScroll: function(scroller, x, y) {
            var me = this,
                oldX, oldY;
            if (!me.blockingScroll) {
                oldX = me._visibleLeft;
                oldY = me.infinite ? me.lastAdjustedPosition : me._visibleTop;
                me.setVisibleLeft(x);
                me.setVisibleTop(y);
                me.fireEvent('scroll', me, {
                    x: x,
                    y: y,
                    oldX: oldX,
                    oldY: oldY
                });
            }
        },
        onContainerScrollStart: function() {
            var me = this,
                pm = me.partnerManager;
            if (me.variableHeights && pm) {
                pm.claimActivePartner(me);
            }
            me.toggleHoverCls(false);
            me.doHover = false;
        },
        onContainerScrollEnd: function() {
            var me = this,
                pm = me.partnerManager;
            me.doHover = true;
            me.toggleHoverCls(true);
            if (me.variableHeights && pm) {
                pm.releaseActivePartner(me);
            }
        },
        onDataItemResize: function(item, width, height, oldWidth, oldHeight) {
            if (oldWidth === null && oldHeight === null) {
                return;
            }
            this.handleItemResize(item, height);
        },
        onItemDisclosureTap: function(item, e) {
            var me = this,
                record = item.getRecord(),
                index = me.store.indexOf(record);
            me.fireAction('disclose', [
                me,
                record,
                item,
                index,
                e
            ], 'doDisclose');
        },
        _onChildTouchCancel: function(e) {
            if (!e.getTarget(this.toolSelector)) {
                this.callParent([
                    e
                ]);
            }
        },
        _onChildTouchEnd: function(e) {
            if (!e.getTarget(this.toolSelector)) {
                this.callParent([
                    e
                ]);
            }
        },
        _onChildTouchStart: function(e) {
            if (!e.getTarget(this.toolSelector)) {
                this.callParent([
                    e
                ]);
            }
        },
        onOffsetChange: function(scroller) {
            var dataItems = this.dataItems,
                ln = dataItems.length,
                i;
            for (i = 0; i < ln; i++) {
                scroller.syncOffsets(dataItems[i].getTranslatable());
            }
        },
        onRangeAvailable: function() {
            this.syncRows();
        },
        onScrollDockItemHide: function(item) {
            var height = item.$height;
            if (height) {
                this.adjustScrollDockHeight(item.scrollDock, -height);
                item.$height = null;
            }
        },
        onScrollDockItemResize: function(item, width, height) {
            var was = item.$height;
            if (was !== height) {
                item.$height = height;
                this.adjustScrollDockHeight(item.scrollDock, height - was);
            }
        },
        onScrollDockItemShow: function(item) {
            var height = item.$height;
            if (height == null) {
                height = this.measureItem(item);
            }
            this.adjustScrollDockHeight(item.scrollDock, height);
        },
        onStoreGroupChange: function() {
            if (this.initialized) {
                this.refreshGrouping();
                this.syncRows();
            }
        },
        onStoreTotalCountChange: function() {
            if (this.getVisibleHeight()) {
                this.syncRowsToHeight();
            }
            this.syncEmptyState();
        },
        addDataItem: function(item, at) {
            var me = this,
                ret;
            ret = me.callParent([
                item,
                at
            ]);
            if (me.infinite) {
                me.getScrollable().syncOffsets(ret.getTranslatable());
            }
            ret.$height = me.variableHeights ? null : me.rowHeight;
            return ret;
        },
        addScrollDockedItem: function(item) {
            var me = this;
            if (me.infinite) {
                item.on({
                    hide: 'onScrollDockItemHide',
                    resize: 'onScrollDockItemResize',
                    show: 'onScrollDockItemShow',
                    scope: me
                });
                item.$height = null;
                me.setItemHidden(item, true);
            }
        },
        adjustContentTop: function(adjust) {
            var me = this,
                rows = this.dataItems,
                len = rows.length,
                renderInfo = me.renderInfo,
                scrollDock = me.scrollDockedItems,
                i, row, decoration, item, items;
            for (i = 0; i < len; ++i) {
                row = rows[i];
                me.setItemPosition(row, row.$position + adjust);
                decoration = row.$header;
                if (decoration) {
                    me.setItemPosition(decoration, decoration.$position + adjust);
                }
                decoration = row.$footer;
                if (decoration) {
                    me.setItemPosition(decoration, decoration.$position + adjust);
                }
                row.$y0 += adjust;
                row.$y1 += adjust;
            }
            if (scrollDock) {
                if (renderInfo.atBegin) {
                    items = scrollDock.start.items;
                    len = items.length;
                    for (i = 0; i < len; ++i) {
                        item = items[i];
                        if (!item.getHidden()) {
                            me.setItemPosition(item, item.$position + adjust);
                        }
                    }
                }
                if (renderInfo.atEnd) {
                    items = scrollDock.end.items;
                    len = items.length;
                    for (i = 0; i < len; ++i) {
                        item = items[i];
                        if (!item.getHidden()) {
                            me.setItemPosition(item, item.$position + adjust);
                        }
                    }
                }
            }
        },
        adjustScrollDockHeight: function(which, amount) {
            var me = this,
                scrollDock = me.scrollDockedItems;
            scrollDock = scrollDock && scrollDock[which];
            if (scrollDock) {
                scrollDock.height += amount;
                me.resyncOnPaint();
            }
        },
        _doActivePartnerCheck: function() {
            if (!this.isActivePartner()) {
                Ext.raise('Should not be called by non-active partner');
            }
        },
        adjustRenderedRows: function(y, oldY) {
            this._doActivePartnerCheck();
            var me = this,
                bufferSize = me.getBufferSize(),
                minimumBufferDistance = me.getMinimumBufferDistance(),
                renderInfo = me.renderInfo,
                indexTop = renderInfo.indexTop,
                indexBottom = renderInfo.indexBottom,
                rows = me.dataItems,
                rowCount = rows.length,
                height = me.getVisibleHeight(),
                storeCount = me.store.getCount(),
                visibleTopIndex = me.recordIndexByPosition(y),
                visibleBottomIndex = me.recordIndexByPosition(y + height),
                newIndexTop, delta;
            if (oldY < y) {
                if (indexBottom - visibleBottomIndex >= minimumBufferDistance) {
                    return;
                }
            } else {
                if (visibleTopIndex - indexTop >= minimumBufferDistance) {
                    return;
                }
            }
            newIndexTop = visibleTopIndex - (bufferSize >>> 1);
            newIndexTop = Math.max(0, Math.min(newIndexTop, storeCount - rowCount));
            delta = newIndexTop - indexTop;
            if (delta > 0 && delta < rowCount) {
                me.rollDown(delta);
            } else if (delta < 0 && -delta < rowCount) {
                me.rollUp(-delta);
            } else if (delta || me.refreshing) {
                me.teleport(y);
            }
        },
        bindStore: function(store) {
            var me = this,
                Model = store.getModel(),
                tombstoneRec = new Model();
            if (store.isBufferedStore) {
                Ext.raise('Did you mean to use Ext.data.virtual.Store? ' + '(Ext.data.BufferedStore is not supported)');
            }
            if (store.isVirtualStore && !me.infinite) {
                Ext.raise('Virtual stores require infinite:true');
            }
            me.dataRange = me.store.createActiveRange({
                prefetch: true,
                callback: 'onRangeAvailable',
                scope: me
            });
            me.tombstoneRec = tombstoneRec;
            tombstoneRec.tombstone = true;
            if (me.getVisibleHeight()) {
                me.syncRowsToHeight();
            }
        },
        bisectPosition: function(y) {
            var rows = this.dataItems,
                begin = 0,
                end = rows.length - 1,
                middle, midVal;
            y = y || 0;
            if (y < rows[0].$y0) {
                return -1;
            }
            while (begin <= end) {
                middle = (begin + end) >>> 1;
                midVal = rows[middle].$y0;
                if (y === midVal) {
                    return middle;
                }
                if (midVal < y) {
                    begin = middle + 1;
                } else {
                    end = middle - 1;
                }
            }
            if (begin && y < rows[begin - 1].$y1) {
                --begin;
            }
            return begin;
        },
        blockAndScrollTo: function(y, anim) {
            var me = this,
                scroller = me.getScrollable();
            if (scroller.getPosition().y !== y) {
                scroller.on({
                    single: true,
                    priority: -1000,
                    scroll: function() {
                        --me.blockingScroll;
                    }
                });
                ++me.blockingScroll;
            }
            return scroller.scrollTo(null, y, anim);
        },
        changeHeaderFooter: function(item, recordIndex, def, enabled) {
            var me = this,
                property = def.name,
                decoration = item[property] || null,
                infinite = me.infinite,
                group, destroyed;
            enabled = enabled && def.config;
            group = enabled && def.map[recordIndex];
            if (group) {
                if (!decoration) {
                    if (!(decoration = def.unused.pop())) {
                        decoration = me[def.creator]();
                    }
                    decoration = me.reorderItem(decoration, item, def.offset);
                }
                decoration.$dataRow = item;
                decoration.setGroup(group);
            } else if (decoration) {
                destroyed = me.removeGroupItem(decoration, def, !enabled);
                if (!destroyed && infinite) {
                    me.setItemHidden(decoration, true);
                    me.reorderItem(decoration);
                }
                decoration = null;
            }
            item[property] = decoration;
        },
        changeItem: function(itemIndex, recordIndex) {
            var me = this,
                options = me.callParent([
                    itemIndex,
                    recordIndex
                ]),
                item = options.item;
            if (me.infinite && me.variableHeights) {
                item.$height = null;
            }
            return options;
        },
        changeItemGrouping: function(options) {
            var me = this,
                enabled = me.isGrouping(),
                groupingInfo = me.groupingInfo,
                item = options.item,
                recordIndex = options.recordIndex,
                collapser;
            me.changeHeaderFooter(item, recordIndex, groupingInfo.header, enabled);
            if (enabled && item.isListItemPlaceholder) {
                collapser = me.getCollapsible();
                if (collapser) {
                    enabled = collapser.getFooter();
                }
            }
            me.changeHeaderFooter(item, recordIndex, groupingInfo.footer, enabled);
        },
        changeItemIsFirst: function(options) {
            if (options.isFirstChanged) {
                var me = this,
                    items = me.scrollDockedItems,
                    i, len;
                me.callParent([
                    options
                ]);
                if (items && !options.isFirst && me.infinite) {
                    items = items.start.items;
                    len = items.length;
                    for (i = 0; i < len; ++i) {
                        me.setItemHidden(items[i], true);
                    }
                }
            }
        },
        changeItemIsLast: function(options) {
            if (options.isLastChanged) {
                var me = this,
                    items = me.scrollDockedItems,
                    i, len;
                me.callParent([
                    options
                ]);
                if (items && !options.isLast && me.infinite) {
                    items = items.end.items;
                    len = items.length;
                    for (i = 0; i < len; ++i) {
                        me.setItemHidden(items[i], true);
                    }
                }
            }
        },
        changeItemRecord: function(options) {
            var me = this,
                itemClasses = options.itemClasses,
                tombstoneCls = me.tombstoneCls;
            if (options.record) {
                delete itemClasses[tombstoneCls];
                me.syncItemRecord(options);
            } else {
                itemClasses[tombstoneCls] = 1;
                me.syncItemRecord(options, me.tombstoneRec);
            }
        },
        changeItemStuck: function(options) {
            var me = this,
                item = options.item,
                record = options.record,
                stickyItem = record && me.stickyItemsByRecordId[record.internalId] || null;
            if (item.$sticky) {
                if (record !== item.getRecord()) {
                    me.dislodgeItem(item, options, stickyItem);
                }
            } else if (stickyItem) {
                me.dislodgeItem(item, options, stickyItem);
                me.removeDataItem(item);
            }
        },
        clearItemCaches: function() {
            var info = this.groupingInfo,
                headers = info.header.unused,
                footers = info.footer.unused,
                placeholders = info.placeholder.unused;
            this.callParent();
            Ext.destroy(headers, footers, placeholders);
            headers.length = footers.length = placeholders.length = 0;
        },
        constrainStickyItem: function(item) {
            var me = this,
                pinnedFooter = me.pinnedFooter,
                pinnedHeader = me.pinnedHeader,
                pinned = false,
                renderInfo = me.renderInfo,
                recordIndex = item.$recordIndex,
                h = me.measureItem(item, me),
                options = item.$sticky,
                y = options.pos,
                y0 = me.getVisibleTop(),
                y1 = y0 + me.getVisibleHeight() - h,
                ret = y,
                hide;
            if (options.floated) {
                me.setItemHidden(item, false);
                return null;
            }
            if (pinnedHeader) {
                y0 += me.measureItem(pinnedHeader);
            }
            if (pinnedFooter) {
                y1 -= me.measureItem(pinnedFooter);
            }
            if (recordIndex < renderInfo.indexTop) {
                hide = true;
                y = y0;
                pinned = 'top';
            } else if (recordIndex >= renderInfo.indexBottom) {
                hide = true;
                y = y1;
                pinned = 'bottom';
            } else if (y < y0) {
                y = y0;
                pinned = 'top';
            } else if (y > y1) {
                y = y1;
                pinned = 'bottom';
            }
            if (options.autoPin) {
                ret = y;
                if (item.isDataViewPinnable) {
                    item.setPinned(pinned);
                }
            } else if (hide) {
                me.setItemHidden(item, true);
            }
            return ret;
        },
        createGroupFooter: function() {
            var me = this,
                footer = me.getGroupFooter();
            if (typeof footer === 'string') {
                footer = {
                    xtype: footer
                };
            }
            footer = Ext.apply({
                $dataItem: 'footer'
            }, footer);
            footer.$initParent = footer.ownerCmp = footer.list = me;
            return footer;
        },
        createGroupHeader: function() {
            var me = this,
                header = me.getGroupHeader(),
                collapser = me.getCollapsible(),
                tool = collapser && collapser.getTool(),
                tools;
            if (typeof header === 'string') {
                header = {
                    xtype: header
                };
            }
            header = Ext.apply({
                $dataItem: 'header'
            }, header);
            header.$initParent = header.ownerCmp = header.list = me;
            if (tool) {
                tool = Ext.clone(tool);
                tools = header.tools;
                if (!tools || Ext.isArray(tools)) {
                    header.tools = tools = tools ? tools.slice() : [];
                    tools.push(tool);
                } else {
                    header.tools = tools = Ext.apply({}, tools);
                    tools[tool.itemId] = tool;
                }
            }
            return header;
        },
        createGroupPlaceholder: function() {
            var me = this,
                config = me.getGroupPlaceholder();
            if (typeof config === 'string') {
                config = {
                    xtype: config
                };
            }
            config = Ext.apply({
                $dataItem: 'placeholder'
            }, config);
            config.$initParent = config.ownerCmp = config.list = me;
            if (!me.variableHeights) {
                config.$height = me.placeholderHeight;
            }
            return config;
        },
        createPinnedHeaderFooter: function(config) {
            return Ext.merge({
                translatable: {
                    type: 'csstransform'
                },
                isPinnedItem: true,
                list: this
            }, config);
        },
        dislodgeItem: function(item, options, replacement) {
            var me = this,
                dataItems = me.dataItems,
                sticky = item.$sticky;
            if (!replacement) {
                replacement = me.acquireItem(me.indexOf(item));
                dataItems.pop();
            }
            else if (replacement.$sticky && !replacement.$sticky.dislodged) {
                me.dislodgeItem(replacement, {
                    itemIndex: dataItems.indexOf(replacement)
                });
            }
            me.dataItems[options.itemIndex] = options.item = replacement;
            replacement.$footer = item.$footer;
            replacement.$header = item.$header;
            replacement.$position = null;
            item.$footer = item.$header = null;
            if (sticky) {
                sticky.dislodged = true;
            }
            sticky = replacement.$sticky;
            if (sticky) {
                sticky.dislodged = false;
            }
            return replacement;
        },
        doClear: function() {
            var me = this,
                groupingInfo = me.groupingInfo,
                headers = groupingInfo.header.unused,
                footers = groupingInfo.footer.unused,
                placeholders = groupingInfo.placeholder.unused,
                scroller;
            Ext.destroy(headers, footers, placeholders);
            footers.length = headers.length = placeholders.length = 0;
            if (me.infinite) {
                me.setItemCount(0);
                me.lastAdjustedPosition = null;
                me.setVisibleTop(0);
                scroller = me.getScrollable();
                scroller.scrollTo(null, 0);
                me.refreshScrollerSize();
                me.syncEmptyState();
            } else {
                me.callParent();
            }
        },
        doDisclose: function(me, record, item, index, e) {
            var onItemDisclosure = me.getOnItemDisclosure(),
                handler = onItemDisclosure,
                scope;
            if (handler && handler !== true) {
                if (handler.handler) {
                    scope = handler.scope;
                    handler = handler.handler;
                }
                Ext.callback(handler, scope, [
                    record,
                    item,
                    index,
                    e
                ], 0, me);
            }
        },
        doRefresh: function(scrollToTop) {
            var me = this,
                scroller = me.getScrollable(),
                store = me.store,
                preventSync, count, restoreFocus, scrollTop;
            if (me.infinite) {
                count = ++me.refreshCounter;
                me.refreshGrouping();
                if (store.getCount()) {
                    me.hideEmptyText();
                    if (count > 1 && scroller) {
                        if (scrollToTop) {
                            restoreFocus = me.saveFocusState();
                            me.blockAndScrollTo(0, false);
                            me.lastAdjustedPosition = null;
                            me.refreshing = true;
                            me.syncRowsToHeight(false);
                            me.resetVisibleTop();
                            me.setVisibleTop(0);
                            preventSync = true;
                            me.refreshing = false;
                            restoreFocus();
                        } else {
                            scrollTop = scroller.getPosition().y;
                        }
                    }
                } else if (me.dataItems.length && !store.hasPendingLoad()) {
                    me.doClear();
                }
                if (!preventSync) {
                    me.resync(true);
                    if (scrollTop != null && scrollTop !== scroller.getPosition().y) {
                        scroller.scrollTo(null, scrollTop);
                    }
                }
            } else {
                me.refreshGrouping();
                me.callParent([
                    scrollToTop
                ]);
            }
        },
        ensureVisibleScroll: function(plan) {
            var me = this,
                recIndex = plan.recordIndex,
                item = plan.item || (plan.item = me.itemFromRecord(recIndex)),
                scroller = me.getScrollable(),
                promise, size, y;
            if (item) {
                return scroller.ensureVisible(item.el, {
                    align: plan.align,
                    animation: plan.animation,
                    highlight: plan.highlight,
                    x: false
                });
            }
            size = scroller.getSize();
            y = Math.floor((size ? size.y : 0) * (recIndex / me.store.getCount()));
            plan.animation = false;
            me.nextTeleportTopIndex = recIndex;
            me.setVisibleTop(y);
            delete me.nextTeleportTopIndex;
            promise = me.blockAndScrollTo(y, false);
            plan.item = me.itemFromRecord(recIndex);
            return promise.then(function() {
                if (!me.destroyed) {
                    plan.item = me.itemFromRecord(recIndex);
                }
                return plan;
            });
        },
        getCacheForItem: function(item) {
            var kind = item.$dataItem,
                ret;
            if (kind === 'record') {
                ret = this.itemCache;
            } else {
                ret = this.groupingInfo[kind];
            }
            return ret;
        },
        getItemForRecord: function(viewIndex, record) {
            var me = this,
                item = me.dataItems[viewIndex],
                recordIsPlaceholder = record && !!record.$collapsedGroupPlaceholder,
                cache = me.groupingInfo.placeholder,
                dom = item.el.dom,
                options, placeholder;
            if (recordIsPlaceholder !== !!item.isListItemPlaceholder) {
                options = {
                    itemIndex: viewIndex
                };
                if (recordIsPlaceholder) {
                    if (!(placeholder = cache.unused.pop())) {
                        placeholder = me.createGroupPlaceholder();
                    }
                    placeholder = me.insert(viewIndex, placeholder);
                    placeholder.setGroup(me.groupFrom(record));
                    dom.parentNode.insertBefore(placeholder.el.dom, dom);
                    me.dislodgeItem(item, options, placeholder);
                    me.removeDataItem(item);
                    item = placeholder;
                } else {
                    placeholder = item;
                    item = me.dislodgeItem(placeholder, options);
                    dom.parentNode.insertBefore(item.el.dom, dom);
                    me.removeGroupItem(placeholder, cache);
                }
            }
            return item;
        },
        getItemFromPoint: function(x, y) {
            var me = this,
                index, pos;
            if (me.infinite) {
                pos = Math.max(0, Math.min(y, me.getScrollable().getSize().y));
                index = me.recordIndexByPosition(pos);
                return me.dataItems[index - me.renderInfo.indexTop];
            }
            return me.callParent([
                x,
                y
            ]);
        },
        getItemTop: function(item) {
            var y;
            item = item.$header || item;
            if (this.infinite) {
                y = item.$y0;
            } else {
                y = this.getScrollable().getEnsureVisibleXY(item.element, {
                    align: {
                        y: 'start?'
                    }
                }).y;
            }
            return y;
        },
        getPositionedItemTarget: function(item) {
            if (item && item.layer === 'inner') {
                return this.callParent([
                    item
                ]);
            }
            return this.bodyElement;
        },
        getRecordIndexFromPoint: function(x, y) {
            if (this.infinite) {
                return this.recordIndexByPosition(Math.max(0, Math.min(y, this.getScrollable().getSize().y)));
            }
            return this.callParent([
                x,
                y
            ]);
        },
        getRenderPartners: function() {
            var partners = this.allPartners;
            if (!(partners && this.variableHeights)) {
                partners = this.selfPartner;
            }
            return partners;
        },
        getRenderTarget: function() {
            return this.innerCt;
        },
        getScrollableClientRegion: function() {
            return this.callParent().adjust(this.getPinnedHeaderHeight() || 0, 0, -(this.getPinnedFooterHeight() || 0), 0);
        },
        getScrollerTarget: function() {
            return this.outerCt;
        },
        getStoreChangeSyncIndex: function(index) {
            return this.isGrouping() ? Math.max(0, index - 1) : index;
        },
        handleItemResize: function(item, height, force) {
            var me = this,
                dataItems = me.dataItems,
                renderInfo = me.renderInfo,
                row = item.$dataRow || item,
                bottomUp, count, index, y;
            height += item.el.getMargin('tb');
            if (force || item.$height !== height) {
                item.$height = height;
                index = dataItems.indexOf(row);
                if (index > -1) {
                    if (renderInfo.indexTop && renderInfo.indexBottom >= me.store.getCount()) {
                        bottomUp = true;
                        count = index + 1;
                        y = row.$y1;
                    } else {
                        count = dataItems.length - index;
                        y = row.$y0;
                    }
                    me.positionItems(y, bottomUp, count);
                }
            }
        },
        isActivePartner: function() {
            if (this.variableHeights && this.partnerManager) {
                return this.partnerManager.isActivePartner(this);
            }
            return true;
        },
        itemFromRecord: function(rec) {
            var me = this,
                store = me.store,
                index, item;
            if (store) {
                if (me.infinite) {
                    index = rec.isEntity ? store.indexOf(rec) : rec;
                    item = me.dataItems[index - me.renderInfo.indexTop];
                } else {
                    item = me.callParent([
                        rec
                    ]);
                }
            }
            return item || null;
        },
        measureItem: function(item, heightCache) {
            var height = item.$height,
                measured;
            if (height == null) {
                if (this.variableHeights || !heightCache || !(height = heightCache.rowHeight)) {
                    measured = item.el.measure('h');
                    height = measured + item.el.getMargin('tb');
                    if (heightCache) {
                        heightCache.rowHeight = height;
                    }
                }
                this.setItemHeight(item, height);
                item.$measured = measured;
            }
            return height;
        },
        measureItems: function() {
            var me = this,
                scrollDock = me.scrollDockedItems,
                rows = me.dataItems,
                n = rows.length,
                active = me.partnerManager && me.isActivePartner(),
                hasItemVm = me.hasItemVm,
                placeholderHeight = me.placeholderHeight,
                decoration, h, i, item, items, row, rowHeight;
            if (me.variableHeights) {
                if (hasItemVm) {
                    me.lookupViewModel().notify();
                }
                while (n-- > 0) {
                    row = rows[n];
                    if (active) {
                        me.measurePartners(row);
                    } else {
                        if (row.$height == null) {
                            row.$height = me.measureItem(row);
                        }
                        decoration = row.$header;
                        if (decoration && decoration.$height == null) {
                            decoration.$height = me.measureItem(decoration);
                        }
                        decoration = row.$footer;
                        if (decoration) {
                            decoration.$height = me.measureItem(decoration);
                        }
                    }
                }
            } else if (n) {
                rowHeight = me.rowHeight;
                if (!rowHeight || placeholderHeight === null) {
                    if (hasItemVm) {
                        me.lookupViewModel().notify();
                    }
                    for (i = 0; i < n; ++i) {
                        row = rows[i];
                        if (!row.isListItemPlaceholder) {
                            if (!rowHeight) {
                                row.$height = null;
                                me.rowHeight = rowHeight = me.measureItem(row);
                            }
                            row.$height = rowHeight;
                        } else {
                            if (placeholderHeight === null) {
                                row.$height = null;
                                me.placeholderHeight = placeholderHeight = me.measureItem(row);
                            }
                            row.$height = placeholderHeight;
                        }
                    }
                }
            }
            if (scrollDock) {
                items = scrollDock.start.items;
                for (h = 0 , n = items.length; n-- > 0; ) {
                    item = items[n];
                    if (!item.getHidden()) {
                        h += item.$height || me.measureItem(item);
                    }
                }
                scrollDock.start.height = h;
                items = scrollDock.end.items;
                for (h = 0 , n = items.length; n-- > 0; ) {
                    item = items[n];
                    if (!item.getHidden()) {
                        h += item.$height || me.measureItem(item);
                    }
                }
                scrollDock.end.height = h;
            }
        },
        measurePartners: function(record, preventNotify) {
            var me = this,
                partners = me.allPartners,
                len = partners.length,
                items = new Array(len),
                largest = 0,
                min = 0,
                allEqual = true,
                item, h, fullH, oldH, p, i, changed;
            if (record.isDataViewItem) {
                record = record.getRecord();
            }
            if (me.hasItemVm && !preventNotify) {
                me.lookupViewModel().notify();
            }
            for (i = 0; i < len; ++i) {
                p = partners[i];
                item = p.itemFromRecord(record);
                items[i] = item;
                item.setMinHeight(null);
            }
            for (i = 0; i < len; ++i) {
                item = items[i];
                oldH = item.$height;
                delete item.$height;
                h = partners[i].measureItem(item);
                fullH = item.$measured;
                changed = changed || oldH !== h;
                if (i === 0) {
                    largest = h;
                    min = fullH;
                }
                if (h !== largest) {
                    allEqual = false;
                    if (h > largest) {
                        largest = h;
                        min = fullH;
                    }
                }
            }
            if (!allEqual) {
                for (i = 0; i < len; ++i) {
                    item = items[i];
                    item.setMinHeight(min);
                    partners[i].setItemHeight(item, largest);
                }
            }
            return changed ? min : null;
        },
        onInnerCtResize: function() {
            this.syncVerticalOverflow();
        },
        positionItems: function(position, bottomUp, count) {
            var me = this,
                renderInfo = me.renderInfo,
                rows = me.dataItems,
                len = rows.length,
                scrollDock = me.scrollDockedItems,
                partners = me.getRenderPartners(),
                partnerLen = partners.length,
                i, j, item, items, y, p;
            for (i = 0; i < partnerLen; ++i) {
                p = partners[i];
                if (bottomUp) {
                    p.positionItemsBottomUp(position, count);
                } else {
                    p.positionItemsTopDown(position, count);
                }
            }
            if (len) {
                renderInfo.top = rows[0].$y0;
                renderInfo.bottom = rows[len - 1].$y1;
            } else {
                renderInfo.top = renderInfo.bottom = scrollDock && scrollDock.start.height || 0;
            }
            renderInfo.height = renderInfo.bottom - renderInfo.top;
            for (i = 0; i < partnerLen; ++i) {
                p = partners[i];
                if (renderInfo.atEnd) {
                    y = renderInfo.bottom;
                    y += p.gapAfter;
                    scrollDock = p.scrollDockedItems;
                    if (scrollDock) {
                        items = scrollDock.end.items;
                        len = items.length;
                        for (j = 0; j < len; ++j) {
                            item = items[j];
                            if (!item.getHidden()) {
                                y += p.setItemPosition(item, y);
                            }
                        }
                    }
                }
                p.refreshScrollerSize();
            }
        },
        positionItemsBottomUp: function(position, count) {
            var me = this,
                groupingInfo = me.groupingInfo,
                footers = groupingInfo.footer,
                headers = groupingInfo.header,
                renderInfo = me.renderInfo,
                rows = me.dataItems,
                scrollDock = me.scrollDockedItems,
                y = position,
                indexTop = renderInfo.indexTop,
                decoration, ht, i, item, row, y1, stickyPos;
            for (i = count; i-- > 0; ) {
                row = rows[i];
                y1 = y;
                decoration = row.$footer;
                if (decoration) {
                    if ((ht = decoration.$height) == null) {
                        ht = me.measureItem(decoration, footers);
                    }
                    y -= ht;
                    me.setItemPosition(decoration, y);
                }
                y -= row.$height;
                if (row.$sticky) {
                    row.$sticky.pos = y;
                    stickyPos = me.constrainStickyItem(row);
                    if (stickyPos !== null) {
                        me.setItemPosition(row, stickyPos);
                    }
                } else {
                    me.setItemPosition(row, y);
                }
                decoration = row.$header;
                if (decoration) {
                    if ((ht = decoration.$height) == null) {
                        ht = me.measureItem(decoration, headers);
                    }
                    y -= ht;
                    me.setItemPosition(decoration, y);
                }
                y -= me.gapMap[i + indexTop] || 0;
                row.$y0 = y;
                row.$y1 = y1;
            }
            if (renderInfo.atBegin && scrollDock) {
                scrollDock = scrollDock.start.items;
                for (i = scrollDock.length; i-- > 0; ) {
                    item = scrollDock[i];
                    if (!item.getHidden()) {
                        y -= item.$height;
                        me.setItemPosition(item, y);
                    }
                }
            }
            if (y < 0 || (y > 0 && renderInfo.indexTop === 0)) {
                me.adjustContentTop(-y);
            }
        },
        positionItemsTopDown: function(position, count) {
            var me = this,
                groupingInfo = me.groupingInfo,
                footers = groupingInfo.footer,
                headers = groupingInfo.header,
                rows = me.dataItems,
                len = rows.length,
                scrollDock = me.scrollDockedItems,
                indexTop = me.renderInfo.indexTop,
                y = position,
                decoration, i, item, row, y0, stickyPos;
            count = count || len;
            if (me.renderInfo.atBegin && count === len) {
                if (scrollDock) {
                    scrollDock = scrollDock.start.items;
                    y = 0;
                    for (i = 0; i < scrollDock.length; ++i) {
                        item = scrollDock[i];
                        if (!item.getHidden()) {
                            y += me.setItemPosition(item, y);
                        }
                    }
                } else if (y && !Object.keys(me.gapMap).length) {
                    Ext.raise('Top-most item should be positioned at 0 not ' + y);
                }
            }
            for (i = len - count; i < len; ++i) {
                row = rows[i];
                y0 = y;
                y += me.gapMap[indexTop + i] || 0;
                decoration = row.$header;
                if (decoration) {
                    if (decoration.$height == null) {
                        me.measureItem(decoration, headers);
                    }
                    y += me.setItemPosition(decoration, y);
                }
                if (row.$sticky) {
                    row.$sticky.pos = y;
                    stickyPos = me.constrainStickyItem(row);
                    if (stickyPos !== null) {
                        y += me.setItemPosition(row, stickyPos);
                    }
                } else {
                    y += me.setItemPosition(row, y);
                }
                decoration = row.$footer;
                if (decoration) {
                    if (decoration.$height == null) {
                        me.measureItem(decoration, footers);
                    }
                    y += me.setItemPosition(decoration, y);
                }
                row.$y0 = y0;
                row.$y1 = y;
            }
        },
        refreshGrouping: function() {
            var me = this,
                grouped = me.isGrouping(),
                infinite = me.infinite,
                item;
            if (infinite) {
                item = (grouped && me.getPinFooters()) ? me.getPinnedFooter() : me.pinnedFooter;
                if (item) {
                    me.setItemHidden(item, true);
                }
                item = (grouped && me.getPinHeaders()) ? me.getPinnedHeader() : me.pinnedHeader;
                if (item) {
                    me.setItemHidden(item, true);
                }
            }
            me.refreshGroupIndices();
            me.syncIndexBar();
        },
        refreshGroupIndices: function() {
            var me = this,
                store = me.store,
                groups = me.isGrouping() ? store.getGroups() : null,
                groupingInfo = me.groupingInfo,
                footers = groupingInfo.footer,
                headers = groupingInfo.header,
                groupCount = groups && groups.length,
                firstRecordIndex, footerIndices, footerMap, group, headerIndices,
                previous = null,
                dataGroup, headerMap, i;
            if (groupCount) {
                headers.map = headerMap = {};
                headers.indices = headerIndices = [];
                footers.map = footerMap = {};
                footers.indices = footerIndices = [];
                for (i = 0; i < groupCount; ++i) {
                    group = me.groupFrom(dataGroup = groups.getAt(i));
                    firstRecordIndex = store.indexOf(dataGroup.first());
                    group.previousGroup = previous;
                    headerIndices.push(firstRecordIndex);
                    headerMap[group.beginIndex = firstRecordIndex] = group;
                    if (previous) {
                        previous.nextGroup = group;
                        footerIndices.push(firstRecordIndex - 1);
                        footerMap[(previous.endIndex = firstRecordIndex) - 1] = previous;
                    }
                    previous = group;
                }
                group.nextGroup = null;
                group.endIndex = i = store.getCount();
                footerIndices.push(--i);
                footerMap[i] = group;
            } else {
                headers.map = headers.indices = footers.map = footers.indices = null;
            }
        },
        refreshScrollerSize: function() {
            var me = this,
                h, renderInfo, scrollDock, storeCount;
            if (me.store && me.infinite) {
                me.syncContentTop();
                renderInfo = me.renderInfo;
                scrollDock = me.scrollDockedItems;
                storeCount = me.store.getCount();
                h = renderInfo.bottom + (storeCount - renderInfo.indexBottom) * me.rowHeight;
                scrollDock = scrollDock && scrollDock.end;
                if (scrollDock) {
                    h += scrollDock.height;
                }
                me.getScrollable().setSize({
                    x: null,
                    y: h
                });
                me.setVerticalOverflow(h > me.getVisibleHeight());
                me.refreshPinnedAreas();
            }
        },
        reorderItem: function(item, ref, offset) {
            offset = offset || 0;
            var me = this,
                innerItems = me.innerItems,
                innerCount = innerItems.length,
                innerIndex = (ref == null) ? innerCount : (ref.isWidget ? innerItems.indexOf(ref) + offset : ref),
                items = me.items,
                index = (innerIndex < innerCount) ? items.indexOf(innerItems[innerIndex]) : items.length;
            if (!item.isWidget || !me.infinite || me.maintainChildNodes || item.parent !== me) {
                item = me.insert(index, item);
            } else {
                items.insert(index, item);
                index = innerItems.indexOf(item);
                if (index > -1) {
                    innerItems.splice(index, 1);
                    if (index < innerIndex) {
                        --innerIndex;
                    }
                }
                if (innerIndex < innerCount) {
                    innerItems.splice(innerIndex, 0, item);
                } else {
                    innerItems.push(item);
                }
            }
            return item;
        },
        recordIndexByPosition: function(y) {
            var me = this,
                renderInfo = me.renderInfo,
                renderTop = renderInfo.top,
                renderBottom = renderInfo.bottom,
                indexTop = renderInfo.indexTop,
                ret;
            if (y < renderTop) {
                ret = Math.floor(y / renderTop * indexTop);
            } else if (y < renderBottom) {
                ret = indexTop + me.bisectPosition(y);
            } else {
                y -= renderBottom;
                ret = Math.min(renderInfo.indexBottom + Math.floor(y / me.rowHeight), me.store.getCount() - 1);
            }
            return ret;
        },
        removeDataItem: function(item, preventCache) {
            var me = this,
                header = item.$header,
                footer = item.$footer,
                groupingInfo = me.groupingInfo;
            if (header) {
                me.removeGroupItem(header, groupingInfo.header, preventCache);
            }
            if (footer) {
                me.removeGroupItem(footer, groupingInfo.footer, preventCache);
            }
            item.$header = item.$footer = null;
            return me.callParent([
                item,
                preventCache
            ]);
        },
        removeGroupItem: function(item, cache, preventCache) {
            var destroyed = this.removeCachedItem(item, preventCache, cache, this.infinite);
            if (!destroyed) {
                item.$dataRow = null;
                if (item.setGroup) {
                    item.setGroup(null);
                }
            }
            return destroyed;
        },
        resync: function(force) {
            var me = this,
                height = me.outerCt.measure('h');
            me.resyncListener = null;
            if (height) {
                if (height === me.getVisibleHeight()) {
                    me.syncRowsToHeight(force);
                } else {
                    me.setVisibleHeight(height);
                }
            }
        },
        resyncOnPaint: function() {
            this.whenVisible('resync', [
                true
            ]);
        },
        rollDown: function(count) {
            this._doActivePartnerCheck();
            var me = this,
                dataItems = me.dataItems,
                renderInfo = me.renderInfo,
                indexBottom = renderInfo.indexBottom,
                tailItem = dataItems[dataItems.length - 1],
                innerTailStart = me.innerItems.indexOf(tailItem) + 1,
                partners = me.getRenderPartners(),
                len = partners.length,
                adjust, decoration, innerTailIndex, i, j, options, p, row;
            if (tailItem.$footer) {
                ++innerTailStart;
            }
            me.setTopRenderedIndex(renderInfo.indexTop + count);
            for (i = 0; i < len; ++i) {
                p = partners[i];
                dataItems = p.dataItems;
                innerTailIndex = innerTailStart;
                for (j = 0; j < count; j++) {
                    row = dataItems.shift();
                    dataItems.push(row);
                    adjust = (row.$header ? 1 : 0) + (row.$footer ? 1 : 0);
                    options = p.changeItem(-1, indexBottom + j);
                    row = options.item;
                    adjust -= (row.$header ? 1 : 0) + (row.$footer ? 1 : 0);
                    innerTailIndex -= adjust;
                    decoration = row.$header;
                    if (decoration) {
                        p.reorderItem(decoration, innerTailIndex);
                    }
                    p.reorderItem(row, innerTailIndex);
                    decoration = row.$footer;
                    if (decoration) {
                        p.reorderItem(decoration, innerTailIndex);
                    }
                }
            }
            me.measureItems();
            me.positionItems(renderInfo.bottom, false, count);
        },
        rollUp: function(count) {
            this._doActivePartnerCheck();
            var me = this,
                dataItems = me.dataItems,
                renderInfo = me.renderInfo,
                indexTop = renderInfo.indexTop,
                headItem = dataItems[0],
                innerHeadStart = me.innerItems.indexOf(headItem),
                partners = me.getRenderPartners(),
                len = partners.length,
                decoration, innerHeadIndex, i, j, options, p, row;
            if (headItem.$header) {
                --innerHeadStart;
            }
            me.setTopRenderedIndex(indexTop - count);
            --indexTop;
            for (i = 0; i < len; ++i) {
                p = partners[i];
                dataItems = p.dataItems;
                innerHeadIndex = innerHeadStart;
                for (j = 0; j < count; j++) {
                    row = dataItems.pop();
                    dataItems.unshift(row);
                    options = p.changeItem(0, indexTop - j);
                    row = options.item;
                    decoration = row.$footer;
                    if (decoration) {
                        p.reorderItem(decoration, innerHeadIndex);
                    }
                    p.reorderItem(row, innerHeadIndex);
                    decoration = row.$header;
                    if (decoration) {
                        p.reorderItem(decoration, innerHeadIndex);
                    }
                }
            }
            me.measureItems();
            me.positionItems(renderInfo.top, true, count);
        },
        setGaps: function(gaps) {
            var me = this;
            gaps = gaps || {};
            if (!Ext.Object.equals(me.gapMap, gaps)) {
                me.gapMap = gaps;
                me.gapAfter = me.gapMap[me.store.getCount()] || 0;
                me.syncRowsToHeight(true);
            }
        },
        setItemHiddenInfinite: function(item, hide) {
            if (!hide) {
                item.$hidden = false;
            } else if (!item.$hidden) {
                item.$hidden = true;
                item.$position = null;
                item.translate(0, -10000);
            }
        },
        setItemPosition: function(item, y) {
            if (item.$hidden) {
                this.setItemHidden(item, false);
            }
            if (item.$position !== y) {
                item.$position = y;
                item.translate(null, y);
            }
            return item.$height;
        },
        setupFooterPinning: function() {
            var me = this;
            return me.setupGroupPinning(me.getPinFooters(), me.pinnedFooter, me.hasPinnedFooterCls, 'setPinnedFooterHeight');
        },
        setupGroupPinning: function(pin, item, cls, setter) {
            var isPinning = pin && !!item;
            if (isPinning) {
                item.setScrollable({
                    x: false,
                    y: false
                });
            } else {
                this[setter](0);
            }
            this.el.toggleCls(cls, isPinning);
            return isPinning;
        },
        setupHeaderPinning: function() {
            var me = this;
            return me.setupGroupPinning(me.getPinHeaders(), me.pinnedHeader, me.hasPinnedHeaderCls, 'setPinnedHeaderHeight');
        },
        shouldHideDisclosure: function(record) {
            var name, show;
            if (this.getOnItemDisclosure()) {
                name = this.getDisclosureProperty();
                show = !name || record.data[name] !== false;
            }
            return !show;
        },
        stickItem: function(item, options) {
            var me = this,
                opt = item.$sticky,
                record = item.getRecord(),
                stickyCls = me.stickyCls,
                stickyItems = me.stickyItems,
                stickyItemsByRecordId = me.stickyItemsByRecordId,
                stickyPos;
            if (!me.infinite) {
                Ext.raise('Only infinite lists support sticky items');
            }
            if (options) {
                if (!opt) {
                    stickyItems.push(item);
                    stickyItemsByRecordId[record.internalId] = item;
                    item.addCls(stickyCls);
                    item.$sticky = opt = {
                        pos: item.$position
                    };
                }
                Ext.apply(opt, options);
                stickyPos = me.constrainStickyItem(item);
                if (stickyPos !== null) {
                    me.setItemPosition(item, stickyPos);
                }
            } else if (opt) {
                Ext.Array.remove(stickyItems, item);
                delete stickyItemsByRecordId[record.internalId];
                item.removeCls(stickyCls);
                item.$sticky = null;
                if (opt.autoPin && item.isDataViewPinnable) {
                    item.setPinned(false);
                }
                if (opt.floated) {
                    delete item.$position;
                }
                if (opt.dislodged) {
                    me.removeDataItem(item);
                } else {
                    me.setItemPosition(item, opt.pos);
                }
            }
        },
        syncContentTop: function() {
            var me = this,
                renderInfo = me.renderInfo,
                visibleTop = me.getVisibleTop(),
                visibleHeight = me.getVisibleHeight(),
                bufferZone = me.getMinimumBufferDistance() * me.rowHeight,
                adjust;
            if (renderInfo.atEnd) {
                return;
            }
            adjust = visibleTop + visibleHeight - (renderInfo.bottom - bufferZone);
            if (adjust >= 0) {
                me.getScrollable().scrollBy(null, -adjust, false);
            }
        },
        syncGroupCollapse: function(group, collapsed) {
            this.store.refreshFromSource();
            this.fireEvent(collapsed ? 'groupcollapse' : 'groupexpand', this, group);
        },
        syncIndexBar: function() {
            var me = this,
                indexBar = me.getIndexBar(),
                store = me.store;
            if (indexBar) {
                indexBar.setHidden(me.getEmptyState() || !store || !store.getGrouper());
            }
        },
        syncPinnedFooter: function(visibleTop) {
            var me = this,
                dataItems = me.dataItems,
                len = dataItems.length,
                pinnedFooter = me.pinnedFooter,
                renderInfo = me.renderInfo,
                grouping = me.pinFooters && pinnedFooter && len && me.isGrouping(),
                hide = pinnedFooter,
                indexTop = renderInfo.indexTop,
                scrollDock = me.scrollDockedItems,
                bottom, footerIndices, footers, height, index, totalHeight, visibleBottomIndex, y, gap;
            visibleTop = visibleTop || me.getVisibleTop();
            if (grouping) {
                totalHeight = me.getScrollable().getSize().y;
                bottom = visibleTop + me.getVisibleHeight();
                hide = bottom <= me.renderInfo.top || bottom >= totalHeight - (scrollDock ? scrollDock.end.height : 0) - me.gapAfter;
                if (!hide) {
                    visibleBottomIndex = me.bisectPosition(bottom - 1) + indexTop;
                    footers = me.groupingInfo.footer;
                    footerIndices = footers.indices;
                    index = Ext.Number.binarySearch(footerIndices, visibleBottomIndex);
                    pinnedFooter.setGroup(footers.map[footerIndices[index]]);
                    if (visibleBottomIndex === footerIndices[index] && dataItems[visibleBottomIndex - indexTop].$y1 === bottom) {
                        hide = true;
                    }
                    else if (index) {
                        index = footerIndices[index - 1];
                        if (index < indexTop) {
                            y = 0;
                        } else {
                            y = dataItems[index - indexTop].$y1;
                            gap = me.gapMap[index + 1] || 0;
                            if (gap) {
                                if (!(hide = bottom - y < gap)) {
                                    y += gap;
                                }
                            }
                        }
                    } else {
                        y = scrollDock ? scrollDock.start.height : 0;
                    }
                    if (!hide) {
                        height = me.measureItem(pinnedFooter);
                        y = bottom - y;
                        y = (y < height) ? height - y : 0;
                        me.setItemPosition(pinnedFooter, y);
                    }
                }
            }
            if (hide) {
                me.setItemHidden(pinnedFooter, true);
            } else if (pinnedFooter) {
                me.syncPinnedHorz(pinnedFooter);
            }
        },
        syncPinnedHeader: function(visibleTop) {
            var me = this,
                dataItems = me.dataItems,
                len = dataItems.length,
                pinnedHeader = me.pinnedHeader,
                renderInfo = me.renderInfo,
                grouping = me.pinHeaders && pinnedHeader && len && me.isGrouping(),
                hide = pinnedHeader,
                indexTop = renderInfo.indexTop,
                scrollDock = me.scrollDockedItems,
                headerIndices, headers, height, index, visibleTopIndex, y, headerIndex, gap, item;
            visibleTop = visibleTop || me.getVisibleTop() || 0;
            if (grouping) {
                hide = (scrollDock && visibleTop <= scrollDock.start.height) || (visibleTopIndex = me.bisectPosition(visibleTop)) < 0 || visibleTopIndex >= len;
                if (!hide) {
                    visibleTopIndex += indexTop;
                    headers = me.groupingInfo.header;
                    headerIndices = headers.indices;
                    index = Ext.Number.binarySearch(headerIndices, visibleTopIndex);
                    if (headerIndices[index] !== visibleTopIndex) {
                        --index;
                    }
                    headerIndex = headerIndices[index];
                    pinnedHeader.setGroup(headers.map[headerIndex]);
                    if (headerIndex >= indexTop) {
                        item = dataItems[headerIndex - indexTop];
                        gap = me.gapMap[headerIndex] || 0;
                        if (gap) {
                            hide = visibleTop - item.$y0 < gap;
                        } else {
                            hide = item.$y0 === visibleTop;
                        }
                    }
                    if (!hide) {
                        ++index;
                        if (index < headerIndices.length) {
                            index = headerIndices[index] - indexTop;
                            y = (index < len) ? dataItems[index].$y0 - visibleTop : 0;
                        } else {
                            y = renderInfo.bottom - visibleTop;
                            hide = y <= 0;
                        }
                        if (!hide) {
                            height = me.measureItem(pinnedHeader);
                            y = (y && y < height) ? y - height : 0;
                            me.setItemPosition(pinnedHeader, y || 0);
                        }
                    }
                }
            }
            if (hide) {
                me.setItemHidden(pinnedHeader, true);
            } else if (pinnedHeader) {
                me.syncPinnedHorz(pinnedHeader);
            }
        },
        syncPinnedHorz: function(item) {
            var me = this,
                scroller = item.getScrollable();
            item.el.setWidth(me.getScrollable().getClientSize().x);
            if (item.isItemHeader && me.getHorizontalOverflow()) {
                item.setContentWidth(me.getInnerWidth());
            }
            if (me.getHorizontalOverflow() && me.getScrollable().isPrimary !== false) {
                scroller.scrollTo(me.getVisibleLeft(), null);
            }
        },
        syncRows: function(bottomUp) {
            var me = this,
                renderInfo = me.renderInfo,
                scrollDock = me.scrollDockedItems,
                partners = me.getRenderPartners(),
                i, position, indexTop, len, innerCt, maxHeight, contentHeight, height, partnerLen, j, p;
            if (!me.infinite) {
                me.syncItemRange();
                return;
            }
            if (!me.isActivePartner()) {
                return;
            }
            maxHeight = me.getMaxHeight();
            len = me.dataItems.length;
            indexTop = renderInfo.indexTop;
            partnerLen = partners.length;
            if (len) {
                if (bottomUp) {
                    position = renderInfo.bottom;
                } else {
                    position = renderInfo.top;
                    if (!indexTop && scrollDock) {
                        position = scrollDock.start.height;
                    }
                }
                for (i = 0; i < partnerLen; ++i) {
                    for (j = 0; j < len; ++j) {
                        partners[i].changeItem(j, indexTop + j);
                    }
                }
            }
            me.measureItems();
            me.positionItems(position, bottomUp, len);
            for (i = 0; i < partnerLen; ++i) {
                p = partners[i];
                if (p.pinnedHeader) {
                    p.syncPinnedHeader();
                }
                if (p.pinnedFooter) {
                    p.syncPinnedFooter();
                }
                if (p.stickyItems.length) {
                    p.syncStickyItems();
                }
                if (maxHeight) {
                    innerCt = p.innerCt;
                    contentHeight = renderInfo.bottom + p.gapAfter;
                    scrollDock = p.scrollDockedItems;
                    if (scrollDock) {
                        contentHeight += scrollDock.end.height;
                    }
                    height = innerCt.measure('h');
                    height = p.el.measure('h') - height + p.el.getBorderWidth('tb');
                    height = Math.min(maxHeight - height, contentHeight);
                    p.setInnerCtHeight(height);
                }
            }
        },
        syncRowsToHeight: function(force) {
            var me = this,
                bufferZone = me.getBufferSize(),
                infinite = me.infinite,
                rowCountWas = me.getItemCount(),
                rowHeight = me.rowHeight || 24,
                firstTime = !me.heightSyncs++,
                renderInfo = me.renderInfo,
                oldIndexBottom = renderInfo && renderInfo.indexBottom,
                storeCount = me.store.getCount(),
                visibleHeight = me.getMaxHeight() || me.getVisibleHeight(),
                partners, indexTop, rowCount, i, len, p, active;
            if (!me.isActivePartner()) {
                return;
            }
            if (infinite) {
                rowCount = Math.ceil(visibleHeight / rowHeight) + bufferZone;
                rowCount = Math.min(rowCount, storeCount);
            } else {
                rowCount = storeCount;
            }
            partners = me.getRenderPartners();
            len = partners.length;
            for (i = 0; i < len; ++i) {
                p = partners[i];
                active = p.isActivePartner();
                p.setItemCount(rowCount);
                if ((firstTime && me.store.isVirtualStore) || rowCountWas !== rowCount || storeCount < oldIndexBottom) {
                    if (infinite && active) {
                        indexTop = Math.min(storeCount - rowCount, renderInfo.indexTop);
                        indexTop = Math.max(0, indexTop);
                        if (indexTop === p.getTopRenderedIndex()) {
                            p.updateTopRenderedIndex(indexTop);
                        } else {
                            p.setTopRenderedIndex(indexTop);
                        }
                    }
                    if (!rowCountWas) {
                        p.refreshGrouping();
                    }
                    force = force !== false;
                    if (force && storeCount < oldIndexBottom && active) {
                        renderInfo.top = renderInfo.indexTop * me.rowHeight;
                    }
                }
            }
            if (force || firstTime) {
                me.syncRows();
            }
        },
        syncStickyItems: function() {
            var me = this,
                stickyItems = me.stickyItems,
                n = stickyItems.length,
                i, stickyItem, stickyPos;
            for (i = 0; i < n; ++i) {
                stickyPos = me.constrainStickyItem(stickyItem = stickyItems[i]);
                if (stickyPos !== null) {
                    me.setItemPosition(stickyItem, stickyPos);
                }
            }
        },
        doSyncVerticalOverflow: function() {
            var scroller = this.getScrollable();
            this.setVerticalOverflow(scroller.getSize().y > scroller.getClientSize().y);
        },
        resetVisibleTop: function() {
            this.lastAdjustedPosition = this._visibleTop = null;
        },
        setItemHeight: function(item, height) {
            item.$height = height;
            if (item.$pinnedFooter) {
                this.setPinnedFooterHeight(height);
            } else if (item.$pinnedHeader) {
                this.setPinnedHeaderHeight(height);
            }
        },
        teleport: function(y) {
            var me = this,
                scrollSize = me.getScrollable().getSize(),
                renderInfo = me.renderInfo,
                rowCount = me.dataItems.length,
                storeCount = me.store.getCount(),
                indexMax = storeCount - rowCount,
                backOff = me.getBufferSize(),
                scrollDock = me.scrollDockedItems,
                nextTeleportTopIndex = me.nextTeleportTopIndex,
                bottomUp, indexTop;
            me._doActivePartnerCheck();
            if (nextTeleportTopIndex !== undefined) {
                indexTop = nextTeleportTopIndex;
            } else {
                indexTop = Math.floor(y / scrollSize.y * storeCount);
            }
            if (indexTop < indexMax) {
                backOff = Math.min(indexTop, backOff >>> 1);
                indexTop -= backOff;
                if (indexTop) {
                    renderInfo.top = Math.max(0, y - me.rowHeight * backOff);
                } else {
                    renderInfo.top = scrollDock ? scrollDock.start.height : 0;
                }
            } else {
                bottomUp = true;
                indexTop = indexMax;
                renderInfo.bottom = scrollSize.y - me.gapAfter;
                if (scrollDock) {
                    renderInfo.bottom -= scrollDock.end.height;
                }
            }
            me.setTopRenderedIndex(indexTop);
            me.syncRows(bottomUp);
        },
        toggleHoverCls: function(on) {
            var me = this,
                target = me.mouseOverItem,
                cls = me.hoveredCls,
                partners = me.partners,
                len, i, item, rec;
            me.callParent([
                on
            ]);
            if (partners && target) {
                rec = target.getRecord();
                for (i = 0 , len = partners.length; i < len; ++i) {
                    item = partners[i].itemFromRecord(rec);
                    if (item) {
                        item.toggleCls(cls, on);
                    }
                }
            }
        },
        setItemSelection: function(records, selected) {
            var me = this,
                len, i, j, selectable, partnerLen,
                partners = me.partners || [];
            me.callParent([
                records,
                selected
            ]);
            if (!me.isActivePartner()) {
                return;
            }
            for (i = 0 , len = records.length; i < len; i++) {
                for (j = 0 , partnerLen = partners.length; j < partnerLen; ++j) {
                    selectable = partners[j].getSelectable();
                    if (selected) {
                        selectable.setSelectedRecord(records[i]);
                    } else {
                        selectable.deselect(records[i], true);
                    }
                }
            }
        },
        syncItemRecord: function(options, tombstoneRec) {
            var me = this,
                ret,
                partners = this.partners || [],
                j, partnerLen, selectable,
                record = options.item.getRecord();
            ret = me.callParent([
                options,
                tombstoneRec
            ]);
            for (j = 0 , partnerLen = partners.length; j < partnerLen; ++j) {
                selectable = partners[j].getSelectable();
                if (selectable.isRowSelected(record)) {
                    me.getSelectable().setSelectedRecord(record);
                    break;
                }
            }
            return ret;
        },
        traverseItem: function(item, delta) {
            var me = this,
                dataItems = me.dataItems,
                renderInfo = me.renderInfo,
                next;
            if (item && me.infinite) {
                if (delta < 0) {
                    if (item === dataItems[0] && !item.isFirst) {
                        next = renderInfo.indexTop;
                    }
                }
                else if (item === dataItems[dataItems.length - 1] && !item.isLast) {
                    next = renderInfo.indexBottom + 1;
                }
            }
            return next ? next - 1 : this.callParent([
                item,
                delta
            ]);
        },
        updateEmptyState: function(empty, was) {
            this.callParent([
                empty,
                was
            ]);
            this.syncIndexBar();
        },
        updateHorizontalOverflow: function(overflow) {
            var scroller = this.getScrollable();
            if (this.manageHorizontalOverflow) {
                scroller.setX(overflow);
                if (!overflow) {
                    scroller.scrollTo(0, null);
                }
            }
        },
        updateInnerCtHeight: function(height) {
            this.innerCt.setHeight(height);
        },
        updateInnerWidth: function(innerWidth) {
            var me = this,
                innerCt = me.innerCt,
                pinnedHeader = me.pinnedHeader,
                pinnedFooter = me.pinnedFooter,
                scrollWidth = 0,
                width;
            if (innerWidth == null) {
                innerCt.setStyle('width', '');
                me.setHorizontalOverflow(false);
            } else {
                innerCt.setStyle('width', innerWidth + 'px');
                width = me.getVisibleWidth();
                if (width != null) {
                    if (me.getVerticalOverflow()) {
                        scrollWidth = me.getScrollable().getScrollbarSize().width;
                    }
                    me.setHorizontalOverflow(width < (innerWidth + scrollWidth));
                }
            }
            me.refreshScrollerSize();
            if (pinnedHeader) {
                me.syncPinnedHorz(pinnedHeader);
            }
            if (pinnedFooter) {
                me.syncPinnedHorz(pinnedFooter);
            }
        },
        updateItemCount: function(value, oldValue) {
            var me = this,
                renderInfo = me.infinite && me.renderInfo;
            me.callParent([
                value,
                oldValue
            ]);
            if (!value && renderInfo) {
                renderInfo.atBegin = renderInfo.atEnd = true;
            }
        },
        updatePinnedFooterHeight: function(height) {
            var me = this;
            if (!me.destroyed && !me.destroying) {
                me.fireEvent('pinnedfooterheightchange', me, height);
            }
        },
        updatePinnedHeaderHeight: function(height) {
            var me = this;
            if (!me.destroyed && !me.destroying) {
                me.fireEvent('pinnedheaderheightchange', me, height);
            }
        },
        updateTopRenderedIndex: function(top) {
            var me = this,
                store = me.store,
                renderInfo = me.renderInfo,
                bottom = top + me.dataItems.length;
            if (!store.isLoaded() && !store.getAutoLoad()) {
                return;
            }
            renderInfo.atBegin = !top;
            renderInfo.atEnd = bottom === store.getCount();
            renderInfo.indexTop = top;
            renderInfo.indexBottom = bottom;
            if (top === bottom && store.isVirtualStore) {
                bottom = top + store.getPageSize();
            }
            me.dataRange.goto(top, bottom);
        },
        updateVerticalOverflow: function(overflow, oldOverflow) {
            var me = this,
                items = me.items.items,
                n = items.length,
                i, item, width;
            if (me.infinite) {
                width = me.getScrollable().getScrollbarSize().reservedWidth;
                for (i = 0; i < n; ++i) {
                    item = items[i];
                    if (item.isPinnedItem) {
                        item.el.setStyle('width', width);
                    }
                }
                me.syncPinnedHeader();
                me.syncPinnedFooter();
                if (oldOverflow != null && overflow !== oldOverflow) {
                    me.updateVisibleWidth(me.bodyElement.getWidth());
                }
            }
            me.fireEvent('verticaloverflowchange', me, overflow);
        },
        updateVisibleHeight: function(height, oldHeight) {
            var me = this;
            if (me.infinite) {
                if (me.store) {
                    me.syncRowsToHeight();
                }
            } else {
                me.syncVerticalOverflow();
            }
            me.fireEvent('visibleheightchange', me, height, oldHeight);
        },
        updateVisibleLeft: function() {
            var me = this;
            if (me.infinite && !me.suspendSync) {
                me.refreshPinnedAreas();
            }
        },
        updateVisibleTop: function(y, oldY) {
            var me = this,
                adjusted, len, i, p, partners;
            if (!me.isActivePartner()) {
                return;
            }
            if (me.infinite) {
                oldY = me.lastAdjustedPosition;
                adjusted = me.dataItems.length && (oldY == null || Math.abs(y - oldY) > me.rowHeight);
                if (adjusted) {
                    me.lastAdjustedPosition = y;
                    me.adjustRenderedRows(y, oldY);
                }
                partners = me.getRenderPartners();
                for (i = 0 , len = partners.length; i < len; ++i) {
                    p = partners[i];
                    if (adjusted) {
                        p.lastAdjustedPosition = y;
                    }
                    p.refreshPinnedAreas(y);
                }
            }
        },
        updateVisibleWidth: function(width) {
            var me = this,
                innerWidth = me.getInnerWidth(),
                scrollWidth = 0;
            if (innerWidth != null) {
                if (me.getVerticalOverflow()) {
                    scrollWidth = me.getScrollable().getScrollbarSize().width;
                }
                me.setHorizontalOverflow(width < (innerWidth + scrollWidth));
            }
        },
        refreshPinnedAreas: function(y) {
            var me = this;
            me.syncPinnedHeader(y);
            me.syncPinnedFooter(y);
            if (me.stickyItems.length) {
                me.syncStickyItems();
            }
        }
    }
}, function(List) {
    var proto = List.prototype,
        handlers = proto._itemChangeHandlers = proto._itemChangeHandlers.slice();
    handlers.unshift('changeItemStuck');
    handlers.push('changeItemGrouping');
});

Ext.define('Ext.dataview.BoundListLocation', {
    extend: Ext.dataview.Location,
    next: function(options) {
        var me = this,
            candidate = me.nextItem(options),
            item = candidate && candidate.get();
        while (candidate && (!item || !candidate.record)) {
            if (candidate.equals(me)) {
                return;
            }
            candidate = candidate.nextItem(options);
            item = candidate && candidate.get();
        }
        return candidate;
    },
    previous: function(options) {
        var me = this,
            candidate = me.previousItem(options),
            item = candidate && candidate.get();
        while (candidate && (!item || !candidate.record)) {
            if (candidate.equals(me)) {
                return;
            }
            candidate = candidate.previousItem(options);
            item = candidate && candidate.get();
        }
        return candidate;
    }
});

Ext.define('Ext.dataview.BoundListNavigationModel', {
    extend: Ext.dataview.NavigationModel,
    alias: 'navmodel.boundlist',
    config: {
        navigateOnSpace: true
    },
    locationClass: 'Ext.dataview.BoundListLocation',
    privates: {
        getKeyNavCfg: function(view) {
            var me = this,
                eventEl;
            if (me.keyboard !== false) {
                eventEl = (view.ownerField || view).getFocusEl();
                if (eventEl) {
                    return {
                        target: eventEl,
                        eventName: 'keydown',
                        defaultEventAction: 'stopEvent',
                        esc: me.onKeyEsc,
                        up: me.onKeyUp,
                        down: me.onKeyDown,
                        right: me.onKeyRight,
                        left: me.onKeyLeft,
                        pageDown: me.onKeyPageDown,
                        pageUp: me.onKeyPageUp,
                        home: me.onKeyHome,
                        end: me.onKeyEnd,
                        tab: me.onKeyTab,
                        space: me.onKeySpace,
                        enter: me.onKeyEnter,
                        A: {
                            ctrl: true,
                            handler: me.onSelectAllKeyPress
                        },
                        priority: 1001,
                        scope: me
                    };
                }
            }
        },
        getViewListeners: function(view) {
            var result = this.callParent([
                    view
                ]);
            result.childtouchstart = 'onChildTouchStart';
            result.childTap = 'onChildTap';
            return result;
        },
        doFocus: Ext.privateFn,
        handleLocationChange: function(location, options) {
            var target = location.sourceElement,
                ownerField = this.getView().ownerField;
            if (target && ownerField) {
                ownerField.inputElement.dom.setAttribute('aria-activedescendant', target.id);
            }
            this.callParent([
                location,
                options
            ]);
        },
        onChildTouchStart: function(view, location) {
            var e = location.event;
            if (e.pointerType !== 'touch') {
                e.preventDefault();
            }
        },
        onChildTap: function(view, location) {
            var me = this,
                e = location.event,
                newLocation;
            if (!view.destroyed) {
                if (e.pointerType === 'touch') {
                    e.preventDefault();
                }
                newLocation = me.createLocation(location.item);
                if (me.location && me.location.equals(newLocation)) {
                    me.onNavigate(e);
                } else {
                    me.setLocation(newLocation, {
                        event: location.event,
                        animation: true
                    });
                }
            }
            if (e.pointerType === 'touch') {
                e.stopEvent();
            }
        },
        onChildTrigger: Ext.privateFn,
        onKeyLeft: function() {
            return true;
        },
        onKeyRight: function() {
            return true;
        },
        onKeySpace: function(e) {
            if (this.getNavigateOnSpace()) {
                e.preventDefault();
                this.onNavigate(e);
            }
            return true;
        },
        onKeyEsc: function() {
            var view = this.getView(),
                field = view.ownerField;
            if (field && view.isVisible()) {
                field.collapse();
            } else {
                return true;
            }
        },
        onKeyTab: function(e) {
            var view = this.getView(),
                field = view.ownerField;
            if (view.isVisible()) {
                if (field.getSelectOnTab()) {
                    this.selectHighlighted(e);
                }
                if (field.collapse) {
                    field.collapse();
                }
            }
            return true;
        },
        onKeyEnter: function(e) {
            var view = this.getView(),
                selectable = view.getSelectable(),
                field = view.ownerField;
            e.stopEvent();
            if (!(field.getMultiSelect && field.getMultiSelect()) && selectable.isSelected(this.location.record) && field.collapse) {
                field.collapse();
            } else {
                this.selectHighlighted(e);
            }
            e.fromBoundList = true;
            field.fireEvent('specialkey', field, e);
            return false;
        },
        onNavigate: function(event) {
            var doNavigate = event && (event.pointerType || (this.getNavigateOnSpace() && event.keyCode === event.SPACE)),
                view = this.getView(),
                field = view.getRefOwner();
            if (doNavigate) {
                this.callParent([
                    event
                ]);
                if (field && field.maybeCollapse) {
                    field.maybeCollapse(event);
                }
            }
        },
        selectHighlighted: function(e) {
            var me = this,
                view = me.getView(),
                store = view.getStore(),
                selectable = view.getSelectable(),
                location = me.location,
                highlightedRec, index;
            if (location && view.getViewItems().length) {
                highlightedRec = location.record;
                if (highlightedRec) {
                    if (e.getKey() === e.ENTER || !selectable.isSelected(highlightedRec)) {
                        selectable.selectWithEvent(highlightedRec, e);
                        if (!view.getStore().contains(highlightedRec)) {
                            index = Math.min(location.recordIndex, store.getCount() - 1);
                            me.setLocation(store.getAt(index));
                        }
                    }
                }
            }
        }
    }
});

Ext.define('Ext.dataview.BoundList', {
    extend: Ext.dataview.List,
    xtype: 'boundlist',
    tabIndex: null,
    focusEl: null,
    focusable: false,
    itemsFocusable: false,
    navigationModel: {
        type: 'boundlist'
    },
    itemConfig: {
        cls: Ext.baseCSSPrefix + 'boundlistitem',
        tools: {
            selected: {
                zone: 'start',
                passive: true,
                cls: Ext.baseCSSPrefix + 'selected-icon',
                iconCls: Ext.baseCSSPrefix + 'fa fa-check'
            }
        }
    },
    onFocusEnter: Ext.emptyFn,
    onFocusLeave: Ext.emptyFn,
    afterShow: function() {
        this.callParent();
        this.getNavigationModel().enable();
    },
    afterHide: function(me) {
        var navModel = me.getNavigationModel();
        me.callParent([
            me
        ]);
        navModel.setLocation(null);
        navModel.disable();
    },
    privates: {
        beforeSelectionRefresh: function(toDeselect, toReselect) {
            var len = toDeselect.length,
                i, rec;
            for (i = 0; i < len; ) {
                rec = toDeselect[i];
                if (rec.isEntered) {
                    toDeselect.splice(i, 1);
                    len--;
                } else {
                    i++;
                }
            }
        }
    }
});

Ext.define('Ext.dataview.DataView', {
    extend: Ext.dataview.Abstract,
    alternateClassName: 'Ext.DataView',
    xtype: 'dataview',
    isElementDataView: true,
    constructor: function(config) {
        if (config && config.useComponents) {
            if (this.self !== Ext.dataview.DataView) {
                Ext.raise('The useComponents config has been replaced by Ext.dataview.Component');
            }
            Ext.log.warn('The useComponents config has been replaced by Ext.dataview.Component');
            return new Ext.dataview['Component'](config);
        }
        if (this.useComponents) {
            Ext.raise('The useComponents config has been replaced by Ext.dataview.Component');
        }
        this.callParent([
            config
        ]);
    },
    getViewItems: function() {
        return Array.prototype.slice.call(this.getFastItems());
    },
    onStoreAdd: function(store, records, index) {
        this.callParent(arguments);
        this.renderItems(index, index + records.length);
    },
    onStoreRemove: function(store, records, index) {
        this.removeItems(index, index + records.length);
    },
    getItemClass: function(data) {
        return this.getItemCls();
    },
    privates: {
        dirtyCls: Ext.baseCSSPrefix + 'dirty',
        changeItem: function(recordIndex) {
            var me = this,
                dataItems = me.dataItems,
                item = dataItems[recordIndex],
                record = me.dataRange.records[recordIndex],
                storeCount = me.store.getCount(),
                options = {
                    isFirst: !recordIndex,
                    isLast: recordIndex === storeCount - 1,
                    item: item,
                    record: record,
                    recordIndex: recordIndex
                };
            me.syncItemRecord(options);
        },
        clearItems: function() {
            var elements = this.dataItems,
                dom;
            while (elements.length) {
                dom = elements.pop();
                Ext.fly(dom).destroy();
            }
        },
        createDataItem: function(index, record) {
            var me = this,
                store = me.store,
                data = me.gatherData(record, index),
                markDirty = me.getMarkDirty(),
                dom, itemEl;
            itemEl = Ext.Element.create(me.getItemElementConfig(index, data, store));
            dom = itemEl.dom;
            if (markDirty) {
                itemEl.addCls(me.markDirtyCls);
            }
            dom.setAttribute('data-viewid', me.id);
            dom.setAttribute('data-recordid', record.internalId);
            dom.setAttribute('data-recordindex', index);
            return itemEl;
        },
        doClear: function() {
            this.clearItems();
            this.callParent();
        },
        resetSelection: function(records) {
            this.setItemSelection(records, false);
        },
        doRefresh: function(scrollToTop) {
            var me = this,
                records = me.dataRange.records,
                storeCount = records.length,
                itemCount = me.dataItems.length,
                scroller = me.getScrollable(),
                restoreFocus, i;
            if (scroller && scrollToTop) {
                scroller.scrollTo(0, 0);
            }
            ++me.refreshCounter;
            if (!storeCount) {
                me.doClear();
            } else {
                restoreFocus = me.saveFocusState();
                me.hideEmptyText();
                me.resetSelection(records);
                if (itemCount > storeCount) {
                    me.removeItems(storeCount, itemCount);
                    itemCount = storeCount;
                } else if (itemCount < storeCount) {
                    me.renderItems(itemCount, storeCount);
                }
                for (i = 0; i < itemCount; ++i) {
                    me.changeItem(i);
                }
                if (me.hasSelection()) {
                    me.setItemSelection(me.getSelections(), true);
                }
                restoreFocus();
            }
        },
        getFastItems: function() {
            return this.getRenderTarget().dom.childNodes;
        },
        getItemElementConfig: function(index, data, store) {
            var me = this,
                result = {
                    cls: me.baseCls + '-item ' + (me.getItemClass(data) || ''),
                    html: me.renderItemTpl(index, data, store)
                };
            if (me.getItemsFocusable()) {
                result.tabIndex = -1;
            }
            return result;
        },
        removeItems: function(from, to) {
            var me = this,
                items = me.dataItems.splice(from, to - from),
                i;
            for (i = 0; i < items.length; ++i) {
                Ext.fly(items[i]).destroy();
            }
        },
        renderItems: function(from, to) {
            var me = this,
                dataItems = me.dataItems,
                records = me.dataRange.records,
                parentNode = me.getRenderTarget().dom,
                args = [
                    from,
                    0
                ],
                before = me.dataItems[from] || null,
                dom, i;
            if (records.length) {
                me.hideEmptyText();
            }
            if (!before) {
                before = me.findTailItem(true);
                before = before && before.el.dom;
            }
            for (i = from; i < to; ++i) {
                args.push(dom = me.createDataItem(i, records[i]).dom);
                parentNode.insertBefore(dom, before);
            }
            dataItems.splice.apply(dataItems, args);
        },
        renderItemTpl: function(index, data, store) {
            var itemTpl = this.getItemTpl(),
                parent = store.getData().items,
                value;
            data.xcount = typeof data.xcount === 'number' ? data.xcount : store.getCount();
            data.xindex = typeof data.xindex === 'number' ? data.xindex : index;
            value = itemTpl.apply(data, parent, index + 1, parent.length);
            value = (value == null) ? '' : String(value);
            return value || this.getEmptyItemText();
        },
        syncItemRecord: function(options) {
            var me = this,
                item = options.item,
                itemFly = Ext.fly(item),
                record = options.record,
                store = me.store,
                recordIndex = options ? options.recordIndex : store.indexOf(record),
                data = me.gatherData(record, recordIndex);
            item.innerHTML = me.renderItemTpl(recordIndex, data, store);
            item.setAttribute('data-recordid', record.internalId);
            item.setAttribute('data-recordindex', recordIndex);
            itemFly.toggleCls(me.dirtyCls, record.dirty);
            itemFly.toggleCls(me.selectedCls, me.getSelectable().isRowSelected(record));
        },
        traverseItem: function(item, delta) {
            var me = this,
                items = me.getRenderTarget().dom.childNodes,
                next = null,
                dom, i;
            if (item) {
                if (item.isElement) {
                    dom = item.dom;
                } else if (item.isWidget) {
                    dom = item.el.dom;
                }
                i = Array.prototype.indexOf.call(items, dom);
                if (i > -1) {
                    next = items[i + delta] || null;
                    if (next) {
                        next = Ext.getCmp(next.id) || next;
                    }
                }
            }
            return next;
        }
    }
});

Ext.define('Ext.dataview.IndexBar', {
    extend: Ext.Component,
    alternateClassName: 'Ext.IndexBar',
    xtype: 'indexbar',
    cachedConfig: {
        letters: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
    },
    config: {
        animation: true,
        autoHide: false,
        dynamic: false,
        listPrefix: null,
        indicator: true
    },
    eventedConfig: {
        direction: 'vertical'
    },
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    inheritUi: true,
    autoHideCls: Ext.baseCSSPrefix + 'autohide',
    classCls: Ext.baseCSSPrefix + 'indexbar',
    horizontalCls: Ext.baseCSSPrefix + 'horizontal',
    indexedCls: Ext.baseCSSPrefix + 'indexed',
    indexedHorizontalCls: Ext.baseCSSPrefix + 'indexed-horizontal',
    indexedVerticalCls: Ext.baseCSSPrefix + 'indexed-vertical',
    indexedNoAutoHideCls: Ext.baseCSSPrefix + 'indexed-no-autohide',
    indicatorCls: Ext.baseCSSPrefix + 'indexbar-indicator',
    pressedCls: Ext.baseCSSPrefix + 'pressed',
    verticalCls: Ext.baseCSSPrefix + 'vertical',
    element: {
        reference: 'element',
        cls: Ext.baseCSSPrefix + 'unselectable',
        children: [
            {
                reference: 'bodyElement',
                cls: Ext.baseCSSPrefix + 'body-el'
            }
        ]
    },
    initialize: function() {
        var me = this,
            bodyElement = me.bodyElement;
        me.callParent();
        bodyElement.addClsOnClick(me.pressedCls);
        bodyElement.on({
            tap: 'onTap',
            touchstart: 'onTouchStart',
            touchend: 'onTouchEnd',
            mouseover: 'onMouseOver',
            mouseout: 'onMouseOut',
            drag: 'onDrag',
            dragEnd: 'onDragEnd',
            scope: me
        });
    },
    getVertical: function() {
        return this.getDirection() === 'vertical';
    },
    setVertical: function(vertical) {
        return this.setDirection(vertical ? 'vertical' : 'horizontal');
    },
    onAdded: function(parent, instanced) {
        var me = this;
        parent.el.addCls(me.indexedCls);
        me.parentListeners = parent.on({
            pinnedfooterheightchange: 'onPinnedFooterHeightChange',
            pinnedheaderheightchange: 'onPinnedHeaderHeightChange',
            verticaloverflowchange: 'onVerticalOverflowChange',
            destroyable: true,
            scope: me
        });
        me.callParent([
            parent,
            instanced
        ]);
    },
    onRemoved: function(destroying) {
        var me = this,
            parent = me.parent;
        Ext.destroy(me.parentListeners);
        if (parent && !parent.destroying && !parent.destroyed) {
            parent.el.removeCls(me.indexedCls);
        }
        me.callParent([
            destroying
        ]);
    },
    privates: {
        parentListeners: null,
        onDrag: function(e) {
            this.trackMove(e, false);
        },
        onDragEnd: function(e) {
            var me = this,
                indicator = me.getIndicator();
            me.trackMove(e, true);
            if (indicator && me.indicator) {
                me.indicator.hide();
            }
        },
        onMouseOver: function() {
            var me = this;
            me.$isMouseOver = true;
            if (me.shouldAutoHide('over')) {
                me.bodyElement.show();
            }
        },
        onMouseOut: function() {
            var me = this;
            me.$isMouseOver = false;
            if (me.shouldAutoHide('out')) {
                me.bodyElement.hide();
            }
        },
        onPinnedFooterHeightChange: function(list, height) {
            this.setBottom(height);
        },
        onPinnedHeaderHeightChange: function(list, height) {
            this.setTop(height);
        },
        onTap: function(e) {
            e.stopPropagation();
        },
        onTouchStart: function(e) {
            var me = this;
            me.$isPressing = true;
            me.pageBox = me.bodyElement.getBox();
            me.onDrag(e);
            if (me.shouldAutoHide('press')) {
                me.bodyElement.show();
            }
        },
        onTouchEnd: function(e) {
            var me = this;
            me.$isPressing = false;
            if (me.shouldAutoHide('release')) {
                me.bodyElement.hide();
            }
            me.onDragEnd(e);
        },
        onVerticalOverflowChange: function(list) {
            this.setRight(list.getScrollable().getScrollbarSize().width);
        },
        scrollToClosestByIndex: function(index) {
            var me = this,
                list = me.parent,
                key = index.toLowerCase(),
                store = list.getStore(),
                groups = store.getGroups(),
                ln = groups.length,
                group, groupKey, i, closest, item, record;
            for (i = 0; i < ln; i++) {
                group = groups.getAt(i);
                groupKey = group.getGroupKey().toLowerCase();
                if (groupKey >= key) {
                    closest = group;
                    break;
                }
                closest = group;
            }
            if (closest) {
                record = closest.first();
                if (!list.getInfinite()) {
                    item = list.itemFromRecord(record).$header;
                }
                list.ensureVisible(record, {
                    animation: me.getAnimation(),
                    item: item,
                    align: {
                        y: 'start'
                    }
                });
            }
        },
        shouldAutoHide: function(trigger) {
            var me = this,
                autoHide = me.getAutoHide(),
                ret = false;
            if (autoHide) {
                if (autoHide === 'pressed' || !Ext.os.is.Desktop) {
                    ret = trigger === 'press' || trigger === 'release';
                } else {
                    ret = trigger === 'over' || (trigger === 'release' && !me.$isMouseOver) || (trigger === 'out' && !me.$isPressing);
                }
            }
            return ret;
        },
        syncIndicatorPosition: function(point, target, isValidTarget) {
            var me = this,
                isUsingIndicator = me.getIndicator(),
                direction = me.getDirection(),
                renderElement = me.renderElement,
                bodyElement = me.bodyElement,
                indicator = me.indicator,
                indicatorInner = me.indicatorInner,
                first = bodyElement.getFirstChild(),
                last = bodyElement.getLastChild(),
                indexbarWidth, indexbarHeight, indicatorSpacing, firstPosition, lastPosition, indicatorSize;
            if (isUsingIndicator && indicator) {
                indicator.show();
                if (direction === 'vertical') {
                    indicatorSize = indicator.getHeight();
                    indexbarWidth = bodyElement.getWidth();
                    indicatorSpacing = bodyElement.getMargin('lr');
                    firstPosition = first.getY();
                    lastPosition = last.getY();
                    if (point.y < firstPosition) {
                        target = first;
                    } else if (point.y > lastPosition) {
                        target = last;
                    }
                    if (isValidTarget) {
                        indicatorInner.setHtml(target.getHtml().toUpperCase());
                    }
                    indicator.setTop(target.getY() - renderElement.getY() - (indicatorSize / 2) + (target.getHeight() / 2));
                    indicator.setRight(indicatorSpacing + indexbarWidth);
                } else {
                    indicatorSize = indicator.getWidth();
                    indicatorSpacing = bodyElement.getMargin('tb');
                    indexbarHeight = bodyElement.getHeight();
                    firstPosition = first.getX();
                    lastPosition = last.getX();
                    if (point.x < firstPosition) {
                        target = first;
                    } else if (point.x > lastPosition) {
                        target = last;
                    }
                    indicator.setLeft(target.getX() - renderElement.getX() - (indicatorSize / 2) + (target.getWidth() / 2));
                    indicator.setBottom(indicatorSpacing + indexbarHeight);
                }
                indicatorInner.setHtml(target.getHtml().toUpperCase());
            }
        },
        trackMove: function(event, drop) {
            var me = this,
                el = me.bodyElement,
                pageBox = me.pageBox || (me.pageBox = me.el.getBox()),
                point = Ext.util.Point.fromEvent(event),
                target, isValidTarget;
            if (me.getDirection() === 'vertical') {
                if (point.y > pageBox.bottom || point.y < pageBox.top) {
                    return;
                }
                target = Ext.Element.fromPoint(pageBox.left + (pageBox.width / 2), point.y);
                isValidTarget = target && target.getParent() === el;
            } else {
                if (point.x > pageBox.right || point.x < pageBox.left) {
                    return;
                }
                target = Ext.Element.fromPoint(point.x, pageBox.top + (pageBox.height / 2));
                isValidTarget = target && target.getParent() === el;
            }
            if (target && isValidTarget) {
                if (me.getIndicator()) {
                    me.syncIndicatorPosition(point, target, isValidTarget);
                }
                if (drop || me.getDynamic()) {
                    me.scrollToClosestByIndex(target.dom.innerHTML);
                }
            }
        },
        updateAutoHide: function(autoHide) {
            var me = this,
                parentEl = me.parent.el,
                autoHideCls = me.autoHideCls,
                indexedNoAutoHideCls = me.indexedNoAutoHideCls;
            me.bodyElement.setVisibilityMode(Ext.Element.OPACITY);
            if (autoHide) {
                me.addCls(autoHideCls);
                me.bodyElement.hide();
                parentEl.removeCls(indexedNoAutoHideCls);
            } else {
                me.removeCls(autoHideCls);
                me.bodyElement.show();
                parentEl.addCls(indexedNoAutoHideCls);
            }
        },
        updateDirection: function(direction) {
            var me = this,
                verticalCls = me.verticalCls,
                horizontalCls = me.horizontalCls,
                indexedVerticalCls = me.indexedVerticalCls,
                indexedHorizontalCls = me.indexedHorizontalCls,
                oldCls, newCls, oldIndexedCls, newIndexedCls;
            if (direction === 'vertical') {
                oldCls = horizontalCls;
                newCls = verticalCls;
                oldIndexedCls = indexedHorizontalCls;
                newIndexedCls = indexedVerticalCls;
            } else {
                oldCls = verticalCls;
                newCls = horizontalCls;
                oldIndexedCls = indexedVerticalCls;
                newIndexedCls = indexedHorizontalCls;
            }
            me.element.replaceCls(oldCls, newCls);
            me.bodyElement.replaceCls(oldCls, newCls);
            me.parent.element.replaceCls(oldIndexedCls, newIndexedCls);
        },
        updateIndicator: function(indicator) {
            var me = this,
                config = {
                    cls: me.indicatorCls
                };
            if (indicator && indicator !== true) {
                config = Ext.apply(config, indicator);
            }
            if (indicator) {
                me.indicator = me.el.appendChild(config);
                me.indicatorInner = me.indicator.appendChild({
                    cls: me.indicatorCls + '-inner'
                });
                me.indicator.hide(false);
            } else if (me.indicator) {
                me.indicator.destroy();
                me.indicatorInner.destroy();
                me.indicator = me.indicatorInner = null;
            }
        },
        updateLetters: function(letters) {
            var bodyElement = this.bodyElement,
                len = letters.length,
                i;
            bodyElement.setHtml('');
            if (letters) {
                for (i = 0; i < len; i++) {
                    bodyElement.createChild({
                        cls: Ext.baseCSSPrefix + 'indexbar-item',
                        html: letters[i]
                    });
                }
            }
        },
        updateListPrefix: function(listPrefix) {
            if (listPrefix && listPrefix.length) {
                this.bodyElement.createChild({
                    html: listPrefix
                }, 0);
            }
        },
        updateUi: function(ui, oldUi) {
            var me = this,
                list = me.parent,
                listElement = list.element,
                indexedCls = me.indexedCls;
            if (oldUi) {
                listElement.removeCls(oldUi, indexedCls);
            }
            if (ui) {
                listElement.addCls(ui, indexedCls);
            }
            me.callParent([
                ui,
                oldUi
            ]);
        }
    }
});

Ext.define('Ext.dataview.ListItem', {
    extend: Ext.dataview.DataItem,
    alternateClassName: 'Ext.dataview.component.ListItem',
    xtype: 'listitem',
    mixins: [
        Ext.dataview.Disclosable,
        Ext.mixin.Toolable,
        Ext.dataview.Pinnable
    ],
    classCls: [
        Ext.baseCSSPrefix + 'listitem',
        Ext.baseCSSPrefix + 'container',
        Ext.baseCSSPrefix + 'component'
    ],
    classClsRoot: true,
    inheritUi: true,
    items: null,
    updateRecord: function(record) {
        var me = this;
        if (!me.destroying && !me.destroyed) {
            me.callParent([
                record
            ]);
            me.syncDisclosure(record);
        }
    },
    doDestroy: function() {
        this.mixins.toolable.doDestroy.call(this);
        this.callParent();
    },
    privates: {
        invokeToolHandler: function(tool, handler, scope, args, e) {
            if (this.invokeDisclosure(tool, handler, e)) {
                return false;
            }
            return tool.invokeToolHandler(tool, handler, scope, args, e);
        }
    }
});

Ext.define('Ext.layout.HBox', {
    extend: Ext.layout.Box,
    alias: 'layout.hbox',
    config: {
        vertical: false
    }
});

Ext.define('Ext.dataview.NestedList', {
    alternateClassName: 'Ext.NestedList',
    extend: Ext.Container,
    xtype: 'nestedlist',
    config: {
        backText: 'Back',
        useTitleAsBackText: true,
        updateTitleText: true,
        displayField: 'text',
        loadingText: 'Loading...',
        emptyText: 'No items available.',
        onItemDisclosure: false,
        allowDeselect: false,
        useToolbar: null,
        toolbar: {
            docked: 'top',
            xtype: 'titlebar',
            ui: 'light',
            inline: true
        },
        title: '',
        layout: {
            type: 'card',
            animation: {
                type: 'slide',
                duration: 250,
                direction: 'left'
            }
        },
        store: null,
        detailContainer: undefined,
        detailCard: null,
        backButton: {
            hidden: true
        },
        listConfig: null,
        variableHeights: false,
        lastNode: null,
        lastActiveList: null,
        ui: null,
        clearSelectionOnListChange: true
    },
    baseCls: Ext.baseCSSPrefix + 'nested-list',
    listMode: 'title',
    constructor: function(config) {
        if (Ext.isObject(config)) {
            if (config.getTitleTextTpl) {
                this.getTitleTextTpl = config.getTitleTextTpl;
            }
            if (config.getItemTextTpl) {
                this.getItemTextTpl = config.getItemTextTpl;
            }
        }
        this.callParent([
            config
        ]);
    },
    changeListMode: function(node) {
        var me = this,
            store = me.getStore(),
            rootNode = store && store.getRoot();
        if (node === rootNode) {
            me.listMode = 'title';
        } else if (node.parentNode === rootNode) {
            me.listMode = 'node';
        } else {
            me.listMode = 'deep';
        }
    },
    onChildInteraction: function() {
        if (this.isGoingTo) {
            return false;
        }
    },
    applyDetailContainer: function(config) {
        if (!config) {
            config = this;
        }
        return config;
    },
    updateDetailContainer: function(newContainer, oldContainer) {
        if (newContainer) {
            newContainer.on('beforeactiveitemchange', 'onBeforeDetailContainerChange', this);
            newContainer.on('activeitemchange', 'onDetailContainerChange', this);
        }
    },
    onBeforeDetailContainerChange: function() {
        this.isGoingTo = true;
    },
    onDetailContainerChange: function() {
        this.isGoingTo = false;
    },
    onChildTap: function(list, location) {
        var me = this,
            hasListeners = me.hasListeners,
            record = location.record;
        if (me.onChildInteraction(list, location) === false) {
            return false;
        }
        if (hasListeners.childtap) {
            location.list = list;
            me.fireEvent('childtap', me, location);
        }
        if (hasListeners.itemtap) {
            me.fireEvent('itemtap', me, list, location.viewIndex, location.child, record, location.event);
        }
        if (record.isLeaf()) {
            if (hasListeners.leafchildtap) {
                location.list = list;
                me.fireEvent('leafchildtap', me, location);
            }
            if (hasListeners.leafitemtap) {
                me.fireEvent('leafitemtap', me, list, location.viewIndex, location.child, record, location.event);
            }
            me.goToLeaf(record);
        } else {
            this.goToNode(record);
        }
    },
    onBeforeSelect: function() {
        this.fireEvent.apply(this, [].concat('beforeselect', this, Array.prototype.slice.call(arguments)));
    },
    onContainerTap: function() {
        this.fireEvent.apply(this, [].concat('containertap', this, Array.prototype.slice.call(arguments)));
    },
    onSelect: function() {
        var args = Array.prototype.slice.call(arguments);
        this.fireEvent.apply(this, [].concat('select', this, args));
        this.onSelectionChange(args);
    },
    onDeselect: function() {
        var args = Array.prototype.slice.call(arguments);
        this.fireEvent.apply(this, [].concat('deselect', this, args));
        this.onSelectionChange(args);
    },
    onSelectionChange: function(args) {
        this.fireEvent.apply(this, [].concat('selectionchange', this, args));
    },
    onChildDoubleTap: function(list, location) {
        var me = this,
            hasListeners = me.hasListeners;
        if (hasListeners.childdoubletap) {
            location.list = list;
            me.fireEvent('childdoubletap', me, location);
        }
        if (hasListeners.itemdoubletap) {
            me.fireEvent('itemdoubletap', me, list, location.viewIndex, location.child, location.record, location.event);
        }
    },
    onStoreBeforeLoad: function() {
        var loadingText = this.getLoadingText();
        if (loadingText) {
            this.setMasked({
                xtype: 'loadmask',
                message: loadingText
            });
        }
        this.fireEvent.apply(this, [].concat('beforeload', this, Array.prototype.slice.call(arguments)));
    },
    onStoreLoad: function(store, records, successful, operation, parentNode) {
        this.setMasked(false);
        this.fireEvent.apply(this, [].concat('load', this, Array.prototype.slice.call(arguments)));
        if (store.indexOf(this.getLastNode()) === -1) {
            this.goToNode(store.getRoot());
        }
    },
    onBackTap: function() {
        var me = this,
            node = me.getLastNode(),
            detailCard = me.getDetailCard(),
            detailCardActive = detailCard && me.getActiveItem() === detailCard,
            layout = me.getLayout(),
            animation = layout ? layout.getAnimation() : null,
            lastActiveList = me.getLastActiveList();
        if (!animation || !(animation && animation.isAnimating)) {
            this.fireAction('back', [
                this,
                node,
                lastActiveList,
                detailCardActive
            ], 'doBack', null, null, 'after');
        }
    },
    doBack: function(me, node, lastActiveList, detailCardActive) {
        var layout = me.getLayout(),
            animation = layout ? layout.getAnimation() : null;
        if (detailCardActive && lastActiveList) {
            if (animation) {
                animation.setReverse(true);
            }
            me.setActiveItem(lastActiveList);
            me.setLastNode(node.parentNode);
            me.syncToolbar();
        } else {
            me.goToNode(node.parentNode);
        }
    },
    updateData: function(data) {
        if (!this.getStore()) {
            this.setStore(new Ext.data.TreeStore({
                root: data
            }));
        }
    },
    applyStore: function(store) {
        if (store) {
            if (Ext.isString(store)) {
                store = Ext.data.StoreManager.get(store);
            } else {
                if (!(store instanceof Ext.data.TreeStore)) {
                    store = Ext.factory(store, Ext.data.TreeStore, null);
                }
            }
            if (!store) {
                Ext.Logger.warn("The specified Store cannot be found", this);
            }
        }
        return store;
    },
    storeListeners: {
        rootchange: 'onStoreRootChange',
        load: 'onStoreLoad',
        beforeload: 'onStoreBeforeLoad'
    },
    updateStore: function(newStore, oldStore) {
        var me = this,
            listeners = this.storeListeners;
        listeners.scope = me;
        if (oldStore && Ext.isObject(oldStore) && oldStore.isStore) {
            if (oldStore.autoDestroy) {
                oldStore.destroy();
            }
            oldStore.un(listeners);
        }
        if (newStore) {
            newStore.on(listeners);
            me.goToNode(newStore.getRoot());
        }
    },
    onStoreRootChange: function(store, node) {
        this.goToNode(node);
    },
    applyDetailCard: function(detailCard, oldDetailCard) {
        return Ext.factory(detailCard, Ext.Component, detailCard === null ? oldDetailCard : undefined);
    },
    applyBackButton: function(config) {
        var toolbar = this.getToolbar();
        return !toolbar ? false : Ext.factory(config, Ext.Button, this.getBackButton());
    },
    updateBackButton: function(newButton, oldButton) {
        var me = this;
        if (newButton) {
            newButton.on('tap', me.onBackTap, me);
            newButton.setText(me.getBackText());
            if (me.$backButtonContainer) {
                me.$backButtonContainer.insert(0, newButton);
            } else {
                me.getToolbar().insert(0, newButton);
            }
        } else if (oldButton) {
            oldButton.destroy();
        }
    },
    applyToolbar: function(config) {
        var containerConfig;
        if (config && config.splitNavigation) {
            Ext.apply(config, {
                docked: 'top',
                xtype: 'titlebar',
                ui: 'light'
            });
            containerConfig = (config.splitNavigation === true) ? {} : config.splitNavigation;
            this.$backButtonContainer = this.add(Ext.apply({
                xtype: 'toolbar',
                docked: 'bottom',
                hidden: true,
                ui: 'dark'
            }, containerConfig));
        }
        return Ext.factory(config, Ext.TitleBar, this.getToolbar());
    },
    updateToolbar: function(newToolbar, oldToolbar) {
        var me = this;
        if (newToolbar) {
            newToolbar.setTitle(me.getTitle());
            if (!newToolbar.getParent()) {
                me.add(newToolbar);
            }
        } else if (oldToolbar) {
            oldToolbar.destroy();
        }
    },
    updateUseToolbar: function(newUseToolbar, oldUseToolbar) {
        if (!newUseToolbar) {
            this.setToolbar(false);
        }
    },
    updateTitle: function(newTitle) {
        var me = this,
            backButton = me.getBackButton();
        if (me.getUpdateTitleText()) {
            if (me.listMode === 'title') {
                me.setToolbarTitle(newTitle);
            } else if (backButton && me.getUseTitleAsBackText() && me.listMode === 'node') {
                backButton.setText(newTitle);
            }
        } else {
            me.setToolbarTitle(newTitle);
        }
    },
    getItemTextTpl: function(node) {
        return '{' + this.getDisplayField() + '}';
    },
    getTitleTextTpl: function(node) {
        return '{' + this.getDisplayField() + '}';
    },
    renderTitleText: function(node, forBackButton) {
        var initialTitle;
        if (!node.titleTpl) {
            node.titleTpl = Ext.create('Ext.XTemplate', this.getTitleTextTpl(node));
        }
        if (node.isRoot()) {
            initialTitle = this.getTitle();
            return (forBackButton && initialTitle === '') ? this.getInitialConfig('backText') : initialTitle;
        }
        return node.titleTpl.applyTemplate(node.data);
    },
    goToNode: function(node) {
        var me = this,
            activeItem, detailCard, detailCardActive, reverse, firstList, secondList, layout, animation, list;
        if (!node) {
            return;
        }
        activeItem = me.getActiveItem();
        detailCard = me.getDetailCard();
        detailCardActive = detailCard && me.getActiveItem() === detailCard;
        reverse = me.goToNodeReverseAnimation(node);
        firstList = me.firstList;
        secondList = me.secondList;
        layout = me.getLayout();
        animation = layout ? layout.getAnimation() : null;
        if (node.isLeaf()) {
            throw new Error('goToNode: passed a node which is a leaf.');
        }
        if (node === me.getLastNode() && !detailCardActive) {
            return;
        }
        if (detailCardActive) {
            if (animation) {
                animation.setReverse(true);
            }
            list = me.getLastActiveList();
            list.getStore().setNode(node);
            node.expand();
            me.setActiveItem(list);
        } else {
            if (animation) {
                animation.setReverse(reverse);
            }
            if (firstList && secondList) {
                activeItem = me.getActiveItem();
                me.setLastActiveList(activeItem);
                list = (activeItem === firstList) ? secondList : firstList;
                list.getStore().setNode(node);
                node.expand();
                me.setActiveItem(list);
                if (me.getClearSelectionOnListChange()) {
                    list.deselectAll();
                }
            } else if (firstList) {
                me.setLastActiveList(me.getActiveItem());
                me.setActiveItem(me.getList(node));
                me.secondList = me.getActiveItem();
            } else {
                me.setActiveItem(me.getList(node));
                me.firstList = me.getActiveItem();
            }
        }
        me.fireEvent('listchange', me, me.getActiveItem());
        me.setLastNode(node);
        me.changeListMode(node);
        me.syncToolbar();
    },
    goToLeaf: function(node) {
        var me = this,
            card, container, sharedContainer, layout, animation, activeItem;
        if (!node.isLeaf()) {
            throw new Error('goToLeaf: passed a node which is not a leaf.');
        }
        card = me.getDetailCard();
        container = me.getDetailContainer();
        sharedContainer = container === me;
        layout = me.getLayout();
        animation = layout ? layout.getAnimation() : false;
        if (card) {
            if (container.getItems().indexOf(card) === -1) {
                container.add(card);
            }
            if (sharedContainer) {
                activeItem = me.getActiveItem();
                if (activeItem instanceof Ext.dataview.List) {
                    me.setLastActiveList(activeItem);
                }
                me.setLastNode(node);
            }
            if (animation) {
                animation.setReverse(false);
            }
            container.setActiveItem(card);
            me.syncToolbar();
        }
    },
    syncToolbar: function(forceDetail) {
        var me = this,
            detailCard = me.getDetailCard(),
            node = me.getLastNode(),
            detailActive = forceDetail || (detailCard && (me.getActiveItem() === detailCard)),
            parentNode = (detailActive) ? node : node.parentNode,
            backButton = me.getBackButton(),
            toolbar = me.getToolbar(),
            splitNavigation;
        if (!toolbar) {
            return;
        }
        if (backButton) {
            splitNavigation = toolbar.getInitialConfig('splitNavigation');
            if (splitNavigation) {
                me.$backButtonContainer[parentNode ? 'show' : 'hide']();
            }
            backButton[parentNode ? 'show' : 'hide']();
            if (parentNode && me.getUseTitleAsBackText()) {
                backButton.setText(me.renderTitleText(node.parentNode, true));
            }
        }
        if (node) {
            me.setToolbarTitle(me.renderTitleText(node));
        }
    },
    updateBackText: function(newText) {
        var btn = this.getBackButton();
        if (btn) {
            btn.setText(newText);
        }
    },
    goToNodeReverseAnimation: function(node) {
        var lastNode = this.getLastNode();
        if (!lastNode) {
            return false;
        }
        return (!lastNode.contains(node) && lastNode.isAncestor(node)) ? true : false;
    },
    getList: function(node) {
        var me = this,
            treeStore = new Ext.data.NodeStore({
                recursive: false,
                node: node,
                rootVisible: false,
                model: me.getStore().getModel(),
                proxy: 'memory'
            }),
            list;
        node.expand();
        list = Ext.create(Ext.Object.merge({
            xtype: 'list',
            pressedDelay: 250,
            autoDestroy: true,
            store: treeStore,
            onItemDisclosure: me.getOnItemDisclosure(),
            variableHeights: me.getVariableHeights(),
            emptyText: me.getEmptyText(),
            selectable: {
                deselectable: me.getAllowDeselect()
            },
            listeners: {
                scope: me,
                childdoubletap: 'onChildDoubleTap',
                beforeselectionchange: 'onBeforeSelect',
                containertap: 'onContainerTap',
                select: 'onSelect',
                deselect: 'onDeselect',
                childtap: {
                    fn: 'onChildTap',
                    priority: 1000
                },
                childtouchstart: {
                    fn: 'onChildInteraction',
                    priority: 1000
                }
            },
            itemTpl: '<span<tpl if="leaf == true"> class="x-list-item-leaf"</tpl>>' + me.getItemTextTpl(node) + '</span>'
        }, me.getListConfig()));
        me.relayEvents(list, [
            'activate'
        ]);
        return list;
    },
    privates: {
        setToolbarTitle: function(newTitle) {
            var me = this,
                toolbar = me.getToolbar();
            if (toolbar) {
                toolbar.setTitle(newTitle);
            }
        }
    }
});

Ext.define('Ext.dataview.plugin.SortableList', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.sortablelist',
    alternateClassName: 'Ext.plugin.SortableList',
    config: {
        list: null,
        source: {
            xclass: 'Ext.drag.Source',
            handle: '.' + Ext.baseCSSPrefix + 'list-sortablehandle',
            constrain: {
                vertical: true
            },
            proxy: {
                getElement: function(info) {
                    return this.getSource().list.mapToItem(info.initialEvent).el;
                }
            }
        }
    },
    init: function(list) {
        this.setList(list);
    },
    updateList: function(list) {
        var source;
        if (list) {
            source = this.getSource();
            if (source) {
                source.list = list;
                source.setElement(list.getRenderTarget());
            }
        }
    },
    applySource: function(source) {
        if (source) {
            source = Ext.create(source);
        }
        return source;
    },
    updateSource: function(source, oldSource) {
        var list = this.getList();
        Ext.destroy(oldSource);
        if (source) {
            source.on({
                scope: this,
                dragstart: 'onDragStart',
                dragmove: 'onDrag',
                dragend: 'onDragEnd'
            });
            if (list) {
                source.list = list;
                source.setElement(list.getRenderTarget());
            }
        }
    },
    onDragStart: function(source, info) {
        var list = this.getList(),
            item = list.mapToItem(info.initialEvent);
        item.addCls(Ext.baseCSSPrefix + 'item-no-ripple');
        item.translate(0, 0);
        info.item = item;
        info.startIndex = item.getRecordIndex();
        info.listTop = list.getRenderTarget().getTop();
        info.itemHeight = item.el.measure('h');
        info.halfHeight = info.itemHeight / 2;
        list.stickItem(item, {
            floated: true
        });
    },
    onDrag: function(source, info) {
        var list = this.getList(),
            top = Math.max(0, info.cursor.current.y - info.listTop),
            idx = list.bisectPosition(top + info.halfHeight),
            o = {};
        o[idx] = info.itemHeight;
        info.index = idx;
        list.setGaps(o);
    },
    onDragEnd: function(source, info) {
        var me = this,
            list = me.getList(),
            item = info.item,
            style = info.item.el.dom.style,
            compareItem = list.mapToItem(info.index),
            top, pos, store, startIndex, index, rec;
        item.getTranslatable().on('animationend', function() {
            if (me.destroyed) {
                return;
            }
            store = list.getStore();
            startIndex = info.startIndex;
            index = compareItem ? compareItem.getRecordIndex() : list.getStore().getCount();
            rec = item.getRecord();
            list.stickItem(item);
            list.setGaps(null);
            if (startIndex !== index) {
                store.insert(index, rec);
                index = store.indexOf(rec);
                item = list.mapToItem(rec);
                list.fireEvent('dragsort', list, item, index);
            }
            item.removeCls(Ext.baseCSSPrefix + 'item-no-ripple');
        }, me, {
            single: true
        });
        if (!compareItem) {
            pos = list.mapToItem(info.index - 1).$y1;
        } else {
            pos = compareItem.$y0;
        }
        top = item.element.getTop(true);
        style.left = style.top = '';
        item.translate(0, top);
        item.translate(null, pos, {
            duration: 100
        });
    }
});

Ext.define('Ext.field.BoxLabelable', {
    extend: Ext.Mixin,
    mixinConfig: {
        id: 'boxLabelable',
        after: {
            initElement: 'afterInitElement'
        }
    },
    config: {
        boxLabel: null,
        boxLabelAlign: null
    },
    boxLabeledCls: Ext.baseCSSPrefix + 'box-labeled',
    getBodyTemplate: function() {
        return [
            {
                reference: 'boxWrapElement',
                cls: Ext.baseCSSPrefix + 'box-wrap-el',
                children: [
                    {
                        reference: 'boxElement',
                        cls: Ext.baseCSSPrefix + 'box-el',
                        children: this.getBoxTemplate()
                    },
                    {
                        tag: 'label',
                        reference: 'boxLabelElement',
                        cls: Ext.baseCSSPrefix + 'box-label-el'
                    }
                ]
            }
        ];
    },
    getBoxTemplate: Ext.emptyFn,
    updateBoxLabel: function(boxLabel) {
        this.boxLabelElement.setHtml(boxLabel);
        this.el.toggleCls(this.boxLabeledCls, !!boxLabel);
    },
    updateBoxLabelAlign: function(boxLabelAlign, oldBoxLabelAlign) {
        var me = this,
            el = me.el;
        if (oldBoxLabelAlign) {
            el.removeCls(Ext.baseCSSPrefix + 'box-label-align-' + oldBoxLabelAlign);
        }
        if (boxLabelAlign) {
            el.addCls(Ext.baseCSSPrefix + 'box-label-align-' + boxLabelAlign);
        }
    },
    afterInitElement: function() {
        var inputElement = this.inputElement;
        if (inputElement) {
            this.boxLabelElement.dom.setAttribute('for', inputElement.id);
        }
    }
});

Ext.define('Ext.field.Checkbox', {
    extend: Ext.field.Input,
    alternateClassName: 'Ext.form.Checkbox',
    xtype: [
        'checkbox',
        'checkboxfield'
    ],
    mixins: [
        Ext.field.BoxLabelable
    ],
    qsaLeftRe: /[[]/g,
    qsaRightRe: /[\]]/g,
    shareableName: true,
    isCheckbox: true,
    defaultBindProperty: 'checked',
    twoWayBindable: {
        checked: 1
    },
    publishes: {
        checked: 1
    },
    config: {
        value: '',
        checked: false
    },
    inputType: 'checkbox',
    classCls: Ext.baseCSSPrefix + 'checkboxfield',
    checkedCls: Ext.baseCSSPrefix + 'checked',
    getBodyTemplate: function() {
        return this.mixins.boxLabelable.getBodyTemplate.call(this);
    },
    getBoxTemplate: function() {
        return [
            {
                reference: 'iconElement',
                cls: Ext.baseCSSPrefix + 'font-icon ' + Ext.baseCSSPrefix + 'icon-el',
                children: [
                    this.getInputTemplate()
                ]
            }
        ];
    },
    getInputTemplate: function() {
        var template = this.callParent();
        template.listeners = template.listeners || {};
        template.listeners.change = {
            fn: 'onChange',
            delegated: false
        };
        return template;
    },
    getSubmitValue: function() {
        return this.getChecked() ? Ext.isEmpty(this._value) ? true : this._value : null;
    },
    serialize: function() {
        return this.getSubmitValue();
    },
    checkedRe: /^(true|1|on)/i,
    getChecked: function() {
        return !!this.inputElement.dom.checked;
    },
    applyChecked: function(checked) {
        if (this.isConfiguring) {
            this.originalState = checked;
        }
        return !!this.checkedRe.test(String(checked));
    },
    updateChecked: function(checked, oldChecked) {
        var me = this,
            eventName;
        if (!me.$onChange) {
            me.inputElement.dom.checked = checked;
        }
        me.toggleCls(me.checkedCls, checked);
        if (me.initialized) {
            eventName = checked ? 'check' : 'uncheck';
            me.fireEvent(eventName, me);
            me.fireEvent('change', me, checked, oldChecked);
        }
        me.setDirty(me.isDirty());
    },
    isChecked: function() {
        return this.getChecked();
    },
    isDirty: function() {
        return this.getChecked() !== this.originalState;
    },
    check: function() {
        return this.setChecked(true);
    },
    uncheck: function() {
        return this.setChecked(false);
    },
    onChange: function(e) {
        var me = this;
        me.$onChange = true;
        me.setChecked(!!e.target.checked);
        delete me.$onChange;
    },
    getSameGroupFields: function() {
        var me = this,
            component = me.lookupNameHolder(),
            name = me.name;
        if (!component) {
            Ext.Logger.warn(me.self.$className + ' components must always be descendants of an Ext.field.Panel.');
            name = name.replace(me.qsaLeftRe, '\\[').replace(me.qsaRightRe, '\\]');
            return Ext.Viewport.query('checkboxfield[name=' + name + ']');
        }
        return component.lookupName(name);
    },
    getGroupValues: function() {
        var values = [];
        this.getSameGroupFields().forEach(function(field) {
            if (field.getChecked()) {
                values.push(field.getValue());
            }
        });
        return values;
    },
    setGroupValues: function(values) {
        this.getSameGroupFields().forEach(function(field) {
            field.setChecked(values.indexOf(field.getValue()) !== -1);
        });
        return this;
    },
    resetGroupValues: function() {
        this.getSameGroupFields().forEach(function(field) {
            field.setChecked(field.originalState);
        });
        return this;
    },
    reset: function() {
        this.setChecked(this.originalState);
        return this;
    },
    resetOriginalValue: function() {
        this.originalState = this.getChecked();
        this.setDirty(false);
    },
    getRawValue: function() {
        return this.getChecked();
    },
    rawToValue: Ext.emptyFn
});

Ext.define('Ext.field.Manager', {
    mixinId: 'fieldmanager',
    fillRecord: function(record) {
        var values, name;
        if (record) {
            values = this.getValues();
            for (name in values) {
                if (values.hasOwnProperty(name) && record.getField(name)) {
                    record.set(name, values[name]);
                }
            }
        }
        return this;
    },
    consumeRecord: function(record) {
        var data = record && record.data;
        if (data) {
            this.setValues(data);
        }
    },
    setValues: function(values) {
        var fields = this.getFields(),
            name, field, value, ln, i, f;
        values = values || {};
        for (name in values) {
            if (values.hasOwnProperty(name)) {
                field = fields[name];
                value = values[name];
                if (field) {
                    if (Ext.isArray(field)) {
                        ln = field.length;
                        for (i = 0; i < ln; i++) {
                            f = field[i];
                            if (f.isRadio) {
                                f.setGroupValue(value);
                                break;
                            } else if (f.isCheckbox) {
                                if (Ext.isArray(value)) {
                                    f.setChecked(value.indexOf(f._value) !== -1);
                                } else {
                                    f.setChecked(value === f._value);
                                }
                            } else {
                                if (Ext.isArray(value)) {
                                    f.setValue(value[i]);
                                }
                            }
                        }
                    } else {
                        if (field.isRadio || field.isCheckbox) {
                            field.setChecked(value);
                        } else {
                            field.setValue(value);
                        }
                    }
                    if (this.getTrackResetOnLoad && this.getTrackResetOnLoad()) {
                        field.resetOriginalValue();
                    }
                }
            }
        }
        return this;
    },
    getValues: function(options, nameless) {
        var fields = this.getFields(),
            values = {},
            isArray = Ext.isArray,
            enabled = options,
            field, value, addValue, bucket, name, ln, i, serialize;
        if (Ext.isObject(options)) {
            enabled = options.enabled;
            nameless = options.nameless;
            serialize = options.serialize;
        }
        addValue = function(field, name) {
            if ((!nameless && (!name || name === 'null')) || field.isFile) {
                return;
            }
            value = (serialize || field.isCheckbox) ? field.serialize() : field.getValue();
            if (!(enabled && field.getDisabled())) {
                if (field.isRadio) {
                    if (field.isChecked()) {
                        values[name] = value;
                    }
                } else {
                    bucket = values[name];
                    if (!Ext.isEmpty(bucket)) {
                        if (!field.isCheckbox || field.isChecked()) {
                            if (!isArray(bucket)) {
                                bucket = values[name] = [
                                    bucket
                                ];
                            }
                            if (isArray(value)) {
                                bucket = values[name] = bucket.concat(value);
                            } else {
                                bucket.push(value);
                            }
                        }
                    } else {
                        values[name] = value;
                    }
                }
            }
        };
        for (name in fields) {
            if (fields.hasOwnProperty(name)) {
                field = fields[name];
                if (isArray(field)) {
                    ln = field.length;
                    for (i = 0; i < ln; i++) {
                        addValue(field[i], name);
                    }
                } else {
                    addValue(field, name);
                }
            }
        }
        return values;
    },
    getSubmitValues: function(options) {
        return this.getValues(Ext.applyIf({
            serialize: true
        }, options));
    },
    reset: function(clearInvalid) {
        this.getFields(false).forEach(function(field) {
            field.reset();
            if (clearInvalid) {
                field.setError(null);
            }
        });
        return this;
    },
    updateDisabled: function(newDisabled) {
        this.getFields(false).forEach(function(field) {
            field.setDisabled(newDisabled);
        });
        return this;
    },
    setErrors: function(errors) {
        var setError = function(field, fieldname) {
                if (field) {
                    messages = errors[fieldname];
                    if (messages === null || (Ext.isArray(messages) && messages.length === 0)) {
                        field.setError(null);
                    } else {
                        field.setError(messages);
                    }
                }
            },
            fieldname, field, messages, i, length;
        if (!Ext.isObject(errors)) {
            Ext.raise('setErrors requires an Object parameter');
        }
        for (fieldname in errors) {
            field = this.lookupName(fieldname) || this.lookup(fieldname);
            if (Ext.isArray(field)) {
                for (i = 0 , length = field.length; i < length; i++) {
                    setError(field[i], fieldname);
                }
            } else {
                setError(field, fieldname);
            }
        }
        return this;
    },
    clearErrors: function() {
        var fields = this.getFields(false),
            i, length, field;
        for (i = 0 , length = fields.length; i < length; i++) {
            field = fields[i];
            if (field.getName() && field.setError) {
                field.setError(null);
            }
        }
        return this;
    },
    getErrors: function() {
        var errors = {},
            fields, i, length, field, error;
        fields = this.getFields(false).filter(function(field) {
            return field.getName();
        });
        for (i = 0 , length = fields.length; i < length; i++) {
            field = fields[i];
            error = field.getError();
            if (!error || !error.length) {
                error = null;
            }
            errors[field.getName()] = error;
        }
        return errors;
    },
    isValid: function() {
        var fields = this.getFields(false),
            i, length;
        for (i = 0 , length = fields.length; i < length; i++) {
            if (!fields[i].isValid()) {
                return false;
            }
        }
        return true;
    },
    validate: function(skipLazy) {
        var fields = this.getFields(false),
            valid = true,
            i, length;
        for (i = 0 , length = fields.length; i < length; i++) {
            if (!fields[i].validate(skipLazy)) {
                valid = false;
            }
        }
        return valid;
    },
    getFields: function(byName, deep) {
        var relation = deep === false ? '>' : '',
            selector = relation + 'field' + (byName ? '[name=' + byName + ']' : ''),
            fields = this.query(selector),
            asArray = byName === false,
            obj, i, length, field, name, bucket;
        if (!fields && asArray) {
            return [];
        } else if (fields && !asArray) {
            if (!byName) {
                obj = {};
                for (i = 0 , length = fields.length; i < length; i++) {
                    field = fields[i];
                    name = field.getName();
                    bucket = obj[name];
                    if (bucket) {
                        if (Ext.isArray(bucket)) {
                            bucket.push(field);
                        } else {
                            obj[name] = [
                                bucket,
                                field
                            ];
                        }
                    } else {
                        obj[name] = field;
                    }
                }
                return obj;
            } else if (fields.length < 2) {
                return fields[0];
            }
        }
        return fields;
    },
    getFocusedField: function() {
        var fields = this.getFields(false),
            ln = fields.length,
            field, i;
        for (i = 0; i < ln; i++) {
            field = fields[i];
            if (field.hasFocus) {
                return field;
            }
        }
        return null;
    },
    getNextField: function() {
        var fields = this.getFields(false),
            focusedField = this.getFocusedField(),
            index;
        if (focusedField) {
            index = fields.indexOf(focusedField);
            if (index !== fields.length - 1) {
                index++;
                return fields[index];
            }
        }
        return false;
    },
    focusNextField: function() {
        var field = this.getNextField();
        if (field) {
            field.focus();
            return field;
        }
        return false;
    },
    getPreviousField: function() {
        var fields = this.getFields(false),
            focusedField = this.getFocusedField(),
            index;
        if (focusedField) {
            index = fields.indexOf(focusedField);
            if (index !== 0) {
                index--;
                return fields[index];
            }
        }
        return false;
    },
    focusPreviousField: function() {
        var field = this.getPreviousField();
        if (field) {
            field.focus();
            return field;
        }
        return false;
    }
});

Ext.define('Ext.mixin.FieldDefaults', {
    extend: Ext.Mixin,
    mixinConfig: {
        id: 'fieldDefaults',
        before: {
            initInheritedState: 'initInheritedState'
        }
    },
    initInheritedState: function(inheritedState) {
        var me = this,
            fieldDefaults = me.fieldDefaults;
        if (fieldDefaults) {
            inheritedState.fieldDefaults = fieldDefaults;
        }
    }
});

Ext.define('Ext.field.trigger.Expand', {
    extend: Ext.field.trigger.Trigger,
    xtype: 'expandtrigger',
    alias: 'trigger.expand',
    classCls: Ext.baseCSSPrefix + 'expandtrigger',
    isExpandTrigger: true,
    handler: 'onExpandTap',
    scope: 'this'
});

Ext.define('Ext.field.Picker', {
    extend: Ext.field.Text,
    xtype: 'pickerfield',
    config: {
        picker: {
            lazy: true,
            $value: 'auto'
        },
        floatedPicker: {
            lazy: true,
            $value: null
        },
        edgePicker: {
            lazy: true,
            $value: null
        },
        clearable: false,
        matchFieldWidth: true,
        floatedPickerAlign: 'tl-bl?',
        pickerSlotAlign: 'center',
        hideTrigger: false,
        focusTrap: {
            lazy: true,
            $value: {
                tabIndex: -1,
                cls: 'x-hidden-clip'
            }
        }
    },
    triggers: {
        expand: {
            type: 'expand'
        }
    },
    alignTarget: 'bodyElement',
    keyMap: {
        scope: 'this',
        DOWN: 'onDownArrow',
        ESC: 'onEsc'
    },
    keyMapTarget: 'inputElement',
    autoComplete: false,
    classCls: Ext.baseCSSPrefix + 'pickerfield',
    initialize: function() {
        var me = this;
        me.callParent();
        Ext.on('hide', 'onGlobalHide', me);
        me.inputElement.on('click', 'onInputElementClick', me);
    },
    onFocusEnter: function(info) {
        this.callParent([
            info
        ]);
        if (Ext.isTouchMode() && info.event.toElement === this.inputElement.dom) {
            this.getFocusTrap().focus();
            this.expand();
        }
    },
    onFocusMove: function(info) {
        var me = this,
            focusTrap;
        me.callParent([
            info
        ]);
        if (Ext.isTouchMode()) {
            focusTrap = me.getFocusTrap();
            if (info.fromElement === focusTrap.dom && info.toElement === me.getFocusEl().dom) {
                if (me.getEditable()) {
                    me.collapse();
                } else {
                    focusTrap.focus();
                    me.expand();
                }
            }
        }
    },
    onFocusLeave: function(e) {
        this.callParent([
            e
        ]);
        this.collapse();
    },
    onEsc: function(e) {
        if (Ext.isIE) {
            e.preventDefault();
        }
        if (this.expanded) {
            this.collapse();
            e.stopEvent();
        }
    },
    onDownArrow: function(e) {
        var me = this;
        if ((e.time - me.lastDownArrow) > 150) {
            delete me.lastDownArrow;
        }
        if (!me.expanded) {
            e.stopEvent();
            me.onExpandTap();
            me.setPickerLocation(true);
            me.lastDownArrow = e.time;
        } else if (!e.stopped && (e.time - me.lastDownArrow) < 150) {
            delete me.lastDownArrow;
        }
    },
    setPickerLocation: Ext.emptyFn,
    updateHideTrigger: function(hideTrigger) {
        var triggers = this.getTriggers(),
            expand = triggers && triggers.expand;
        if (expand) {
            expand.setHidden(hideTrigger);
        }
    },
    applyPicker: function(picker) {
        var me = this,
            pickerListeners = {
                show: 'onPickerShow',
                hide: 'onPickerHide',
                scope: me
            },
            type = picker,
            config;
        if (!type) {
            type = 'auto';
        } else if (Ext.isObject(picker)) {
            type = null;
            if (!picker.isWidget && !picker.xtype) {
                config = picker;
                type = 'auto';
            }
        }
        if (type) {
            if (type === 'auto') {
                type = me.getAutoPickerType();
            }
            if (type === 'edge') {
                picker = me.createEdgePicker(config);
            } else if (type !== 'floated') {
                Ext.raise('Picker type must be "edge" or "floated" not "' + type + '"');
            } else {
                picker = me.createFloatedPicker(config);
                pickerListeners.resize = pickerListeners.hiddenchange = 'realignFloatedPicker';
            }
        }
        if (picker.isWidget) {
            picker.ownerField = me;
        } else {
            picker = Ext.apply({
                ownerField: me
            }, picker);
            me.fireEvent('beforepickercreate', me, picker);
            picker = Ext.create(picker);
        }
        me.pickerType = type || (picker.isViewportMenu ? 'edge' : 'floated');
        me.fireEvent('pickercreate', me, picker);
        picker.on(pickerListeners);
        return picker;
    },
    getAutoPickerType: function() {
        return Ext.platformTags.phone ? 'edge' : 'floated';
    },
    getRefItems: function(deep) {
        var me = this,
            result = me.callParent([
                deep
            ]),
            picker = me.getConfig('picker', false, true);
        if (picker) {
            result.push(picker);
            if (deep) {
                Ext.Array.push(result, picker.getRefItems(deep));
            }
        }
        return result;
    },
    updatePicker: function(picker) {
        var value = this.getValue();
        if (picker && picker.setValue && value != null) {
            if (this.pickerType === 'floated' || picker.isPicker) {
                picker.setValue(value);
            }
        }
    },
    applyFocusTrap: function(focusTrap) {
        var result = this.el.appendChild(Ext.dom.Element.create(focusTrap));
        result.$isFocusTrap = true;
        return result;
    },
    onResize: function() {
        var me = this,
            picker = me.getConfig('picker', false, true),
            GlobalEvents = Ext.GlobalEvents,
            scrollableAncestor;
        if (picker && me.pickerType === 'floated' && picker.isVisible()) {
            scrollableAncestor = me.up('[scrollable]');
            if (scrollableAncestor) {
                scrollableAncestor = scrollableAncestor.getScrollable();
                GlobalEvents.suspendEvent('scroll');
                scrollableAncestor.ensureVisible(me.el);
            }
            me.realignFloatedPicker();
            if (scrollableAncestor) {
                Ext.defer(GlobalEvents.resumeEvent, 100, GlobalEvents, [
                    'scroll'
                ]);
            }
        }
    },
    realignFloatedPicker: function(picker) {
        var me = this;
        picker = picker || me.getConfig('picker', false, true);
        if (picker && picker.isVisible()) {
            if (me.getMatchFieldWidth()) {
                picker.setWidth(me[me.alignTarget].getWidth());
            }
            picker.realign(me[me.alignTarget], me.getFloatedPickerAlign(), {
                minHeight: 100
            });
            if (!Ext.keyboardMode) {
                me.setPickerLocation();
            }
        }
    },
    onInputElementClick: function(e) {
        var me = this;
        if (e.pointerType === 'mouse' && (!me.getEditable() && !me.getReadOnly())) {
            me[me.expanded ? 'collapse' : 'expand']();
        }
    },
    onExpandTap: function() {
        if (this.expanded) {
            if (Ext.now() - this.expanded > 100) {
                this.collapse();
            }
        } else {
            this.expand();
        }
        return false;
    },
    expand: function() {
        if (!this.expanded && !this.getDisabled()) {
            this.showPicker();
        }
    },
    collapse: function() {
        var picker,
            eXt = Ext;
        if (this.expanded) {
            picker = this.getPicker();
            if (this.pickerType === 'edge') {
                eXt.Viewport.removeMenu(picker.getSide(), true);
            } else {
                picker.hide();
            }
        }
    },
    collapseIf: function(e) {
        var me = this;
        if (!me.destroyed && (!e.within(me.bodyElement, false, true) && !me.owns(e.target))) {
            me.collapse();
        }
    },
    showPicker: function() {
        var me = this,
            alignTarget = me[me.alignTarget],
            picker = me.getPicker();
        if (me.pickerType === 'floated') {
            if (me.getMatchFieldWidth()) {
                picker.setWidth(alignTarget.getWidth());
            }
            picker.showBy(alignTarget, me.getFloatedPickerAlign(), {
                minHeight: 100
            });
            me.touchListeners = Ext.getDoc().on({
                translate: false,
                touchstart: me.collapseIf,
                scope: me,
                delegated: false,
                destroyable: true
            });
        } else {
            me.setShowPickerValue(picker);
            picker.show();
        }
    },
    updatePickerValue: function(picker, value) {
        var slot = picker.getSlots()[0],
            name = slot.name || slot.getName(),
            pickerValue = {};
        pickerValue[name] = value;
        picker.setValue(pickerValue);
    },
    onPickerShow: function() {
        var me = this;
        me.expanded = Ext.now();
        if (me.pickerType === 'edge') {
            me.el.dom.scrollIntoView();
        }
        if (me.pickerType === 'edge') {
            me.el.dom.scrollIntoView();
        }
        me.hideEventListeners = Ext.on({
            mousedown: 'collapseIf',
            scroll: 'onGlobalScroll',
            scope: me,
            destroyable: true
        });
        me.fireEvent('expand', me);
    },
    onPickerHide: function() {
        var me = this;
        me.expanded = false;
        Ext.destroy(me.hideEventListeners, me.touchListeners);
        me.fireEvent('collapse', me);
    },
    doDestroy: function() {
        this.destroyMembers('picker', 'hideEventListeners', 'touchListeners', 'focusTrap');
        this.callParent();
    },
    privates: {
        isFocusing: function(info) {
            return info.event.toElement === this.getFocusTrap().dom || this.callParent([
                info
            ]);
        },
        isBlurring: function(info) {
            return info.event.fromElement === this.getFocusTrap().dom || this.callParent([
                info
            ]);
        },
        onGlobalHide: function(cmp) {
            if (this === cmp || cmp.isAncestor(this)) {
                this.collapse();
            }
        },
        onGlobalScroll: function(scroller, x, y) {
            var me = this,
                scrollingEl = scroller.getElement();
            if (me.expanded) {
                if (me.pickerType === 'edge') {
                    return;
                }
                if (!me.getPicker().owns(scrollingEl) && scrollingEl.dom !== document.body) {
                    me.collapse();
                }
            }
        },
        revertFocusTo: function(target) {
            if (Ext.isTouchMode()) {
                this.getFocusTrap().focus();
            } else {
                target.focus();
            }
        },
        setShowPickerValue: function(picker) {
            var value = this.getValue();
            if (value != null) {
                this.updatePickerValue(picker, value);
            }
        }
    }
});

Ext.define('Ext.field.trigger.Date', {
    extend: Ext.field.trigger.Expand,
    xtype: 'datetrigger',
    alias: 'trigger.date',
    classCls: Ext.baseCSSPrefix + 'datetrigger'
});

Ext.define('Ext.layout.Carousel', {
    extend: Ext.layout.Auto,
    alias: 'layout.carousel',
    config: {
        visibleChildren: 1,
        frontIndex: {
            $value: true,
            lazy: true
        },
        animation: true
    },
    vertical: false,
    targetCls: Ext.baseCSSPrefix + 'layout-carousel',
    wrapCls: Ext.baseCSSPrefix + 'layout-carousel-wrap',
    itemCls: Ext.baseCSSPrefix + 'layout-carousel-item',
    singularCls: Ext.baseCSSPrefix + 'layout-carousel-singular',
    destroy: function() {
        var container = this.getContainer();
        Ext.destroy(container.carouselElement, this.activeAnim);
        this.callParent();
    },
    updateContainer: function(container, oldContainer) {
        var me = this;
        me.callParent([
            container,
            oldContainer
        ]);
        container.bodyElement.addCls(me.wrapCls);
        container.carouselElement = container.getRenderTarget().appendChild({
            cls: me.targetCls
        });
        Ext.override(container, {
            privates: {
                getRenderTarget: function() {
                    return this.carouselElement;
                }
            }
        });
    },
    onContainerInitialized: function(container) {
        var me = this;
        me.callParent([
            container
        ]);
        if (!me.frontItem) {
            me.setFrontItem(me.getFrontIndex(), false);
        }
    },
    updateVisibleChildren: function(count) {
        var me = this,
            target = me.getContainer().getRenderTarget(),
            pct, items, item, i, len;
        items = me.getLayoutItems();
        pct = me.calcItemBasis(count) + '%';
        if (items.length > count) {
            target.setStyle('left', '-' + pct);
            target.setStyle('transform', 'translateX(' + pct + ')');
        }
        for (i = 0 , len = items.length; i < len; i++) {
            item = items[i];
            item.el.setStyle('flex-basis', pct);
        }
        target.toggleCls(me.singularCls, count === 1);
    },
    applyFrontIndex: function(itemIdx) {
        var count, index;
        if (typeof itemIdx !== 'number') {
            count = this.getVisibleChildren();
            index = count - 1;
            itemIdx = !index ? index : index % 2 ? Math.floor(index / 2) + 1 : index / 2;
        }
        return itemIdx;
    },
    applyDuration: function(duration) {
        if (typeof duration !== 'number') {
            duration = parseInt(duration, 10) || 500;
        }
        return duration;
    },
    calcItemBasis: function(count) {
        count = count != null ? count : this.getVisibleChildren();
        return count === 1 ? 100 : !(count % 2) ? 100 / count : (100 / count).toFixed(5);
    },
    insertInnerItem: function(item, index) {
        var me = this;
        me.callParent([
            item,
            index
        ]);
        if (index === 0) {
            me.frontItem = item;
        }
        item.el.setStyle('order', index + 1);
        item.el.setStyle('flex-basis', me.calcItemBasis() + '%');
    },
    getLayoutItemCount: function() {
        return this.getLayoutItems().length;
    },
    getLayoutItems: function() {
        return this.getContainer().getInnerItems();
    },
    getItemIndex: function(item) {
        return this.getContainer().innerIndexOf(item);
    },
    shiftIndex: function(index, increment) {
        var count = this.getLayoutItemCount();
        index += increment;
        if (increment < 0) {
            index = index < 0 ? count - 1 : index;
        } else if (increment > 0) {
            index = index >= count ? 0 : index;
        }
        return index;
    },
    getVisibleItems: function() {
        return this.visibleItems;
    },
    getEdgeItem: function(increment) {
        var items = this.getOrderedLayoutItems();
        return increment < 0 ? items[0] : items[items.length - 1];
    },
    getFirstVisibleItem: function() {
        return this.getVisibleItems()[0];
    },
    getLastVisibleItem: function() {
        var items = this.getVisibleItems();
        return items[items.length - 1];
    },
    getFrontItem: function() {
        return this.frontItem;
    },
    getFrontItemIndex: function() {
        return this.getItemIndex(this.getFrontItem());
    },
    getOrderedLayoutItems: function() {
        var items = Ext.Array.clone(this.getLayoutItems());
        return items.sort(this.sortByOrder);
    },
    setFrontItem: function(index, animate) {
        var me = this,
            container = me.getContainer(),
            target = container.getRenderTarget(),
            frontIndex = me.getFrontIndex(),
            visibleChildren = me.getVisibleChildren(),
            items, item, oldFrontItem, oldFrontIndex, visibleItems, direction, basis, i, len, ret, deferred;
        items = me.getLayoutItems();
        if (items.length < visibleChildren) {
            return Ext.Deferred.getCachedResolved();
        }
        if (typeof index !== 'number') {
            index = items.indexOf(index);
        }
        basis = me.calcItemBasis();
        target.setStyle('left', '-' + basis + '%');
        oldFrontItem = me.getFrontItem();
        me.frontItem = items[index];
        frontIndex++;
        items = items.slice(index).concat(items.slice(0, index));
        oldFrontIndex = items.indexOf(oldFrontItem);
        items = items.slice(-frontIndex).concat(items.slice(0, items.length - frontIndex));
        if (animate == null) {
            animate = me.getAnimation();
        }
        if (animate) {
            if (typeof animate === 'boolean') {
                animate = {};
            }
            direction = oldFrontIndex > -1 && oldFrontIndex <= Math.floor(items.length / 2) ? 1 : -1;
            Ext.destroy(me.activeAnim);
            deferred = new Ext.Deferred();
            ret = deferred.promise;
            me.activeAnim = Ext.Animator.run(Ext.apply({
                element: target,
                to: {
                    transform: {
                        translateX: (basis * direction) + '%'
                    }
                },
                callback: function() {
                    me.orderItems(items);
                    deferred.resolve();
                    me.activeAnim = null;
                }
            }, animate));
        }
        me.visibleItems = visibleItems = [];
        for (i = 0 , len = items.length; i < len; i++) {
            item = items[i];
            if (i > 0 && i <= visibleChildren) {
                visibleItems.push(item);
            }
            item.$carouselOrder = i + 1;
        }
        if (!animate) {
            me.orderItems(items);
            ret = Ext.Deferred.getCachedResolved();
        }
        visibleItems.sort(me.sortByOrder);
        return ret;
    },
    getMoveItem: function(increment) {
        var index = this.getFrontItemIndex();
        index = this.shiftIndex(index, increment);
        return this.getLayoutItems()[index];
    },
    cancelAnimation: function() {
        Ext.destroy(this.activeAnim);
    },
    move: function(increment, animate) {
        return this.setFrontItem(this.getMoveItem(increment), animate);
    },
    prev: function(animate) {
        return this.move(-1, animate);
    },
    next: function(animate) {
        return this.move(1, animate);
    },
    privates: {
        orderItems: function(items) {
            var len = items.length,
                i, item;
            for (i = 0; i < len; ++i) {
                item = items[i];
                item.el.setStyle('order', item.$carouselOrder + 1);
            }
        },
        sortByOrder: function(a, b) {
            return +a.$carouselOrder - b.$carouselOrder;
        }
    }
});

Ext.define('Ext.field.Date', {
    extend: Ext.field.Picker,
    alternateClassName: [
        'Ext.form.DatePicker',
        'Ext.field.DatePicker'
    ],
    xtype: [
        'datefield',
        'datepickerfield'
    ],
    config: {
        destroyPickerOnHide: false,
        dataType: {
            type: 'date'
        },
        dateFormat: '',
        altFormats: 'm/d/Y|' + 'n/j/Y|' + 'n/j/y|' + 'm/j/y|' + 'n/d/y|' + 'm/j/Y|' + 'n/d/Y|' + 'm-d-y|' + 'm-d-Y|' + 'm/d|' + 'm-d|' + 'md|' + 'mdy|' + 'mdY|' + 'd|' + 'Y-m-d|' + 'n-j|' + 'n/j',
        minDate: null,
        maxDate: null,
        triggers: {
            expand: {
                type: 'date'
            }
        }
    },
    classCls: Ext.baseCSSPrefix + 'datepickerfield',
    matchFieldWidth: false,
    isDateField: true,
    minDateMessage: "The date in this field must be equal to or after {0}",
    maxDateMessage: "The date in this field must be equal to or before {0}",
    initTime: '12',
    initTimeFormat: 'H',
    floatedPicker: {
        xtype: 'datepanel',
        autoConfirm: true,
        floated: true,
        listeners: {
            tabout: 'onTabOut',
            select: 'onPickerChange',
            scope: 'owner'
        },
        keyMap: {
            ESC: 'onTabOut',
            scope: 'owner'
        }
    },
    edgePicker: {
        xtype: 'datepicker',
        cover: true
    },
    parseValidator: 'date',
    applyValue: function(value, oldValue) {
        if (!(value || value === 0)) {
            value = null;
        }
        value = this.callParent([
            value,
            oldValue
        ]);
        if (value) {
            if (this.isConfiguring) {
                this.originalValue = value;
            }
            if (Ext.isDate(value) && Ext.isDate(oldValue) && value.getTime() === oldValue.getTime()) {
                return;
            }
        }
        return value;
    },
    updateValue: function(value, oldValue) {
        var picker = this._picker;
        if (picker && picker.isPicker && Ext.isDate(value)) {
            this.updatePickerValue(picker, value);
        }
        this.callParent([
            value,
            oldValue
        ]);
    },
    updatePickerValue: function(picker, value) {
        picker.setValue(value);
    },
    applyInputValue: function(value, oldValue) {
        if (Ext.isDate(value)) {
            value = Ext.Date.format(value, this.getDateFormat());
        }
        return this.callParent([
            value,
            oldValue
        ]);
    },
    applyAltFormats: function(altFormats) {
        if (altFormats && !Ext.isArray(altFormats)) {
            altFormats = altFormats.split('|');
        }
        return altFormats;
    },
    applyDateFormat: function(dateFormat) {
        return dateFormat || Ext.util.Format.defaultDateFormat;
    },
    updateDateFormat: function() {
        var me = this,
            value;
        if (!me.isConfiguring && !me.hasFocus) {
            value = me.getValue();
            if (Ext.isDate(value)) {
                me.setInputValue(value);
            }
        }
    },
    applyMinDate: function(minDate) {
        if (typeof minDate === 'string') {
            minDate = Ext.Date.parse(minDate, this.getDateFormat());
        }
        if (!Ext.isDate(minDate)) {
            Ext.raise("Date object or string in dateFormat required");
        }
        return Ext.Date.clearTime(minDate, true);
    },
    applyMaxDate: function(maxDate) {
        if (typeof maxDate === 'string') {
            maxDate = Ext.Date.parse(maxDate, this.getDateFormat());
        }
        if (!Ext.isDate(maxDate)) {
            Ext.raise("Date object or string in dateFormat required");
        }
        return Ext.Date.clearTime(maxDate, true);
    },
    getFormattedValue: function(format) {
        var value = this.getValue();
        return Ext.isDate(value) ? Ext.Date.format(value, format || this.getDateFormat()) : '';
    },
    applyPicker: function(picker, oldPicker) {
        var me = this;
        picker = me.callParent([
            picker,
            oldPicker
        ]);
        if (picker) {
            me.pickerType = picker.xtype === 'datepicker' ? 'edge' : 'floated';
            picker.ownerCmp = me;
        }
        return picker;
    },
    createFloatedPicker: function() {
        return this.getFloatedPicker();
    },
    createEdgePicker: function() {
        var me = this,
            minDate = this.getMinDate(),
            maxDate = this.getMaxDate();
        return Ext.merge({
            yearFrom: minDate ? minDate.getFullYear() : (new Date().getFullYear() - 20),
            yearTo: maxDate ? maxDate.getFullYear() : (new Date().getFullYear() + 20)
        }, me.getEdgePicker());
    },
    setPickerLocation: function(fromKeyboard) {
        var me = this,
            pickerType = me.pickerType,
            picker = me.getPicker(),
            value = me.getValue(),
            limit;
        me.$ignorePickerChange = true;
        if (value != null) {
            picker.setValue(value);
        } else if (pickerType === 'edge') {
            picker.setValue(new Date());
        }
        delete me.$ignorePickerChange;
        if (pickerType === 'floated') {
            picker.el.dom.tabIndex = -1;
            limit = me.getMinDate();
            if (limit) {
                picker.setMinDate(limit);
            }
            limit = me.getMaxDate();
            if (limit) {
                picker.setMaxDate(limit);
            }
            value = value || new Date();
            picker.navigateTo(value, false);
            if (fromKeyboard) {
                picker.focusDate(value);
            }
        }
    },
    doValidate: function(value, errors, skipLazy) {
        var me = this,
            format = me.getDateFormat(),
            limit, t;
        me.callParent([
            value,
            errors,
            skipLazy
        ]);
        limit = me.getMinDate();
        t = +value;
        if (limit && t < +limit) {
            limit = Ext.Date.format(limit, format);
            errors.push(Ext.String.format(me.minDateMessage, limit));
        }
        limit = me.getMaxDate();
        if (limit && t > +limit) {
            limit = Ext.Date.format(limit, format);
            errors.push(Ext.String.format(me.maxDateMessage, limit));
        }
    },
    onPickerChange: function(picker, value) {
        var me = this;
        if (me.$ignorePickerChange) {
            return;
        }
        me.forceSetValue(value);
        me.fireEvent('select', me, value);
        me.onTabOut(picker);
    },
    onTabOut: function() {
        this.collapse();
    },
    parseValue: function(value, errors) {
        var me = this,
            date = value,
            defaultFormat = me.getDateFormat(),
            altFormats = me.getAltFormats(),
            formats = altFormats ? [
                defaultFormat
            ].concat(altFormats) : [
                defaultFormat
            ],
            formatsLength = formats.length,
            i, format;
        if (date) {
            if (!Ext.isDate(date)) {
                for (i = 0; i < formatsLength; i++) {
                    format = formats[i];
                    date = Ext.Date.parse(value + ' ' + me.initTime, format + ' ' + me.initTimeFormat);
                    if (date) {
                        return Ext.Date.clearTime(date);
                    }
                }
            }
            if (date !== null) {
                return date;
            }
        }
        return this.callParent([
            value,
            errors
        ]);
    },
    isEqual: function(value1, value2) {
        var v1 = this.transformValue(value1),
            v2 = this.transformValue(value2);
        return +v1 === +v2;
    },
    transformValue: function(value) {
        if (Ext.isObject(value)) {
            value = new Date(value.year, value.month, value.day);
            if (isNaN(value.getTime())) {
                value = null;
            }
        }
        return value;
    },
    doDestroy: function() {
        var picker = this._picker;
        if (picker && picker.isPicker) {
            picker.destroy();
        }
        this.callParent();
    },
    rawToValue: function(rawValue) {
        var me = this;
        return me.parseValue(rawValue) || rawValue || null;
    },
    privates: {
        setShowPickerValue: function(picker) {
            this.updatePickerValue(picker, this.getValue() || new Date());
        }
    },
    deprecated: {
        '6.5': {
            configs: {
                format: 'dateFormat'
            }
        }
    }
});

Ext.define('Ext.field.Number', {
    extend: Ext.field.Text,
    xtype: 'numberfield',
    alternateClassName: 'Ext.form.Number',
    config: {
        minValue: null,
        maxValue: null,
        decimals: 2,
        trim: true,
        decimalSeparator: null
    },
    inputType: Ext.os.is.Desktop ? 'text' : 'number',
    minValueText: 'The minimum value for this field is {0}',
    maxValueText: 'The maximum value for this field is {0}',
    decimalsText: 'The maximum decimal places is {0}',
    badFormatMessage: 'Value is not a valid number',
    classCls: Ext.baseCSSPrefix + 'numberfield',
    parseValidator: 'number',
    initialize: function() {
        var me = this;
        me.getDecimals();
        if (me.getDecimalSeparator() === null) {
            me.setDecimalSeparator(Ext.util.Format.decimalSeparator);
        }
        me.callParent();
        me.inputElement.dom.setAttribute('inputmode', 'numeric');
        if (me.getInputMask()) {
            Ext.raise('NumberFields cannot use input masks');
        }
    },
    updateDecimals: function(decimals) {
        var me = this,
            format = '0',
            zeroChar = me.getTrim() ? '#' : '0',
            value;
        me.syncDecimalValidator();
        if (decimals) {
            format += '.' + Ext.String.repeat(zeroChar, decimals);
        }
        me.numberFormat = format;
        if (!me.isConfiguring) {
            value = me.getValue();
            if (Ext.isDate(value)) {
                me.setInputValue(value);
            }
        }
    },
    applyInputValue: function(value) {
        var me = this,
            decimalSeparator = me.getDecimalSeparator();
        this.getDecimals();
        if (typeof value === 'number') {
            value = Ext.util.Format.number(value, this.numberFormat);
        }
        if (value && Ext.isString(value) && decimalSeparator) {
            value = value.replace(Ext.util.Format.decimalSeparator, decimalSeparator);
        }
        return value;
    },
    doValidate: function(value, errors, skipLazy) {
        var me = this,
            String = Ext.String,
            minValue = me.getMinValue(),
            maxValue = me.getMaxValue();
        me.callParent([
            value,
            errors,
            skipLazy
        ]);
        if (minValue != null && value < minValue) {
            errors.push(String.format(me.minValueText, minValue));
        } else if (maxValue != null && value > maxValue) {
            errors.push(String.format(me.maxValueText, maxValue));
        }
    },
    onKeyDown: function(e) {
        var me = this,
            raw;
        if (me.getInputType() !== 'number') {
            if (!e.ctrlKey && !e.altKey) {
                raw = me.calculateNewValue(e.key());
                if (!me.specialKeys[e.getCharCode()] && !me.isAllowableValue(raw)) {
                    e.preventDefault();
                    return false;
                }
            }
        }
        me.callParent([
            e
        ]);
    },
    transformValue: function(value) {
        if (!(value || value === 0)) {
            value = null;
        }
        return value;
    },
    rawToValue: Ext.emptyFn,
    updateDecimalSeparator: function() {
        this.syncDecimalValidator();
    },
    privates: {
        calculateNewValue: function(text) {
            var me = this,
                textSelection = me.getTextSelection(),
                raw = me.getInputValue();
            if (textSelection[1]) {
                raw = raw.substr(0, textSelection[0]) + text + raw.substr(textSelection[1]);
            } else {
                raw = Ext.String.insert(raw, text, me.getCaretPos());
            }
            return raw;
        },
        handlePaste: function(e) {
            var me = this,
                text;
            if (me.getInputType() !== 'number') {
                text = e.getClipboardData('text/plain');
                if (text) {
                    text = me.calculateNewValue(text);
                    if (me.isAllowableValue(text)) {
                        me.setValue(text);
                    }
                    e.preventDefault();
                    return false;
                }
            }
            me.callParent([
                e
            ]);
            me.validate();
        },
        isAllowableValue: function(value) {
            var minValue = this.getMinValue(),
                allowNegative = minValue == null || minValue < 0;
            if (!allowNegative && Ext.String.startsWith(value, '-')) {
                return false;
            }
            return this.isPartialValue(value) || this.parseValue(value) !== null;
        },
        isPartialValue: function(value) {
            var me = this,
                minValue = me.getMinValue(),
                allowNegative = minValue == null || minValue < 0;
            if (allowNegative && value === '-') {
                return true;
            }
            if (me.getDecimals() && (value === '.' || (allowNegative && value === '-.'))) {
                return true;
            }
            return false;
        },
        syncDecimalValidator: function() {
            var me = this,
                separator = (me.getDecimals() === 0) ? null : me.getDecimalSeparator();
            me.setParseValidator(Ext.create('Ext.data.validator.Number', {
                decimalSeparator: separator
            }));
            me.validate();
        }
    }
}, function(C) {
    var E = Ext.event.Event;
    C.prototype.specialKeys = Ext.Array.toMap([
        E.BACKSPACE,
        E.TAB,
        E.RETURN,
        E.CTRL,
        E.DELETE,
        E.LEFT,
        E.RIGHT,
        E.UP,
        E.DOWN,
        E.HOME,
        E.END,
        E.META
    ]);
});

Ext.define('Ext.form.Borders', {
    mixinId: 'formborders',
    config: {
        fieldSeparators: null,
        inputBorders: null
    },
    fieldSeparatorsCls: Ext.baseCSSPrefix + 'form-field-separators',
    noInputBordersCls: Ext.baseCSSPrefix + 'form-no-input-borders',
    updateFieldSeparators: function(fieldSeparators, oldFieldSeparators) {
        var bodyElement = this.bodyElement,
            cls = this.fieldSeparatorsCls;
        if (fieldSeparators) {
            bodyElement.addCls(cls);
        } else if (oldFieldSeparators) {
            bodyElement.removeCls(cls);
        }
    },
    updateInputBorders: function(inputBorders, oldInputBorders) {
        var bodyElement = this.bodyElement,
            cls = this.noInputBordersCls;
        if (inputBorders === false) {
            bodyElement.addCls(cls);
        } else if (oldInputBorders === false) {
            bodyElement.removeCls(cls);
        }
    }
});

Ext.define('Ext.field.Panel', {
    extend: Ext.Panel,
    xtype: 'fieldpanel',
    isFieldPanel: true,
    mixins: [
        Ext.field.Dirty,
        Ext.field.Manager,
        Ext.form.Borders
    ],
    scrollable: true,
    nameable: true,
    shareableName: true,
    nameHolder: true,
    publishes: {
        dirty: 1
    },
    config: {
        api: null,
        baseParams: null,
        paramOrder: null,
        paramsAsHash: null,
        timeout: 30,
        url: null
    },
    load: function(options) {
        var me = this,
            api, url, waitMsg, successFn, failureFn, load, args;
        options = options || {};
        api = me.getApi();
        url = options.url || me.getUrl();
        waitMsg = options.waitMsg;
        successFn = function(response, data) {
            me.setValues(data.data);
            if (Ext.isFunction(options.success)) {
                options.success.call(options.scope || me, me, response, data);
            }
            me.fireEvent('load', me, response);
        };
        failureFn = function(response, data) {
            if (Ext.isFunction(options.failure)) {
                options.failure.call(options.scope, me, response, data);
            }
            me.fireEvent('exception', me, response);
        };
        if (options.waitMsg) {
            if (typeof waitMsg === 'string') {
                waitMsg = {
                    xtype: 'loadmask',
                    message: waitMsg
                };
            }
            me.setMasked(waitMsg);
        }
        if (api) {
            api = Ext.direct.Manager.resolveApi(api, me);
            me.setApi(api);
            load = api.load;
            if (!load) {
                Ext.raise("Cannot find Ext Direct API method for load action");
            }
            args = load.$directCfg.method.getArgs({
                params: me.getParams(options.params),
                paramOrder: me.getParamOrder(),
                paramsAsHash: me.getParamsAsHash(),
                scope: me,
                callback: function(data, response, success) {
                    me.setMasked(false);
                    if (success) {
                        successFn(response, data);
                    } else {
                        failureFn(response, data);
                    }
                }
            });
            load.apply(window, args);
        } else if (url) {
            return Ext.Ajax.request({
                url: url,
                timeout: (options.timeout || me.getTimeout()) * 1000,
                method: options.method || 'GET',
                autoAbort: options.autoAbort,
                headers: Ext.apply({
                    'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8'
                }, options.headers || {}),
                callback: function(callbackOptions, success, response) {
                    var responseText = response.responseText,
                        statusResult = Ext.data.request.Ajax.parseStatus(response.status, response);
                    me.setMasked(false);
                    if (success) {
                        if (statusResult && responseText.length === 0) {
                            success = true;
                        } else {
                            response = Ext.decode(responseText);
                            success = !!response.success;
                        }
                        if (success) {
                            successFn(response, responseText);
                        } else {
                            failureFn(response, responseText);
                        }
                    } else {
                        failureFn(response, responseText);
                    }
                }
            });
        }
    },
    getParams: function(params) {
        return Ext.apply({}, params, this.getBaseParams());
    },
    updateDisabled: function(newDisabled, oldDisabled) {
        this.mixins.fieldmanager.updateDisabled.call(this, newDisabled, oldDisabled);
        this.callParent([
            newDisabled,
            oldDisabled
        ]);
    },
    updateRecord: function(record) {
        this.consumeRecord(record);
    }
});

Ext.define('Ext.field.Slider', {
    extend: Ext.field.Field,
    xtype: 'sliderfield',
    alternateClassName: 'Ext.form.Slider',
    mixins: [
        Ext.mixin.ConfigProxy,
        Ext.field.BoxLabelable
    ],
    config: {
        slider: {
            xtype: 'slider',
            inheritUi: true
        },
        liveUpdate: false,
        tabIndex: -1,
        readOnly: false,
        value: 0
    },
    classCls: Ext.baseCSSPrefix + 'sliderfield',
    proxyConfig: {
        slider: [
            'increment',
            'minValue',
            'maxValue'
        ]
    },
    bodyAlign: 'stretch',
    defaultBindProperty: 'value',
    twoWayBindable: {
        values: 1,
        value: 1
    },
    constructor: function(config) {
        config = config || {};
        if (config.hasOwnProperty('values')) {
            config.value = config.values;
        }
        this.callParent([
            config
        ]);
        this.updateMultipleState();
    },
    initialize: function() {
        this.callParent();
        this.getSlider().on({
            scope: this,
            change: 'onSliderChange',
            dragstart: 'onSliderDragStart',
            drag: 'onSliderDrag',
            dragend: 'onSliderDragEnd'
        });
    },
    getBodyTemplate: function() {
        return this.mixins.boxLabelable.getBodyTemplate.call(this);
    },
    applySlider: function(slider) {
        if (slider && !slider.isInstance) {
            slider = this.mergeProxiedConfigs('slider', slider);
            slider.$initParent = this;
            slider = Ext.create(slider);
            delete slider.$initParent;
        }
        this.boxElement.appendChild(slider.el);
        slider.ownerCmp = this;
        return slider;
    },
    updateSlider: function(slider) {
        slider.doInheritUi();
    },
    getValue: function() {
        return this._value;
    },
    applyValue: function(value, oldValue) {
        value = this.callParent([
            value,
            oldValue
        ]) || 0;
        if (this.dragging && this.isSyncing('value')) {
            value = undefined;
        } else if (Ext.isArray(value)) {
            value = value.slice(0);
            if (oldValue && Ext.Array.equals(value, oldValue)) {
                value = undefined;
            }
        } else {
            value = [
                value
            ];
        }
        return value;
    },
    updateValue: function(value, oldValue) {
        if (!this.dragging) {
            value = this.setSliderValue(value);
        }
        this.callParent([
            value,
            oldValue
        ]);
    },
    setSliderValue: function(value) {
        return this.getSlider().setValue(value).getValue();
    },
    onSliderChange: function(slider, thumb, newValue, oldValue) {
        this.setValue(slider.getValue());
        this.fireEvent('dragchange', this, slider, thumb, newValue, oldValue);
    },
    onSliderDragStart: function(slider, thumb, startValue, e) {
        this.dragging = true;
        this.fireEvent('dragstart', this, slider, thumb, startValue, e);
    },
    onSliderDrag: function(slider, thumb, value, e) {
        var me = this;
        if (me.getLiveUpdate()) {
            me.setValue(slider.getValue());
        }
        me.fireEvent('drag', me, slider, thumb, value, e);
    },
    onSliderDragEnd: function(slider, thumb, startValue, e) {
        this.dragging = false;
        this.fireEvent('dragend', this, slider, thumb, startValue, e);
    },
    setValues: function(value) {
        this.setValue(value);
        this.updateMultipleState();
    },
    getValues: function() {
        return this.getValue();
    },
    reset: function() {
        var config = this.config,
            initialValue = (this.config.hasOwnProperty('values')) ? config.values : config.value;
        this.setValue(initialValue);
    },
    updateReadOnly: function(newValue) {
        this.getSlider().setReadOnly(newValue);
    },
    updateMultipleState: function() {
        var value = this.getValue();
        if (value && value.length > 1) {
            this.addCls(Ext.baseCSSPrefix + 'slider-multiple');
        }
    },
    updateDisabled: function(disabled, oldDisabled) {
        this.callParent([
            disabled,
            oldDisabled
        ]);
        this.getSlider().setDisabled(disabled);
    },
    doDestroy: function() {
        this.getSlider().destroy();
        this.callParent();
    },
    getRefItems: function(deep) {
        var refItems = [],
            slider = this.getSlider();
        if (slider) {
            refItems.push(slider);
            if (deep && slider.getRefItems) {
                refItems.push.apply(refItems, slider.getRefItems(deep));
            }
        }
        return refItems;
    },
    rawToValue: Ext.emptyFn
});

Ext.define('Ext.field.SingleSlider', {
    extend: Ext.field.Slider,
    xtype: 'singlesliderfield',
    twoWayBindable: {
        value: 1
    },
    defaultBindProperty: 'value',
    publishes: {
        value: 1
    },
    applyValue: function(value, oldValue) {
        value = this.callParent([
            value,
            oldValue
        ]);
        if (value && Ext.isArray(value)) {
            value = value[0];
        }
        return value;
    },
    getValue: function() {
        var value = this.callParent();
        if (value && Ext.isArray(value)) {
            value = value[0];
        }
        return value;
    },
    onSliderChange: function(slider, thumb, newValue, oldValue) {
        this.setValue(newValue);
        this.fireEvent('dragchange', this, slider, newValue, oldValue);
    },
    onSliderDragStart: function(slider, thumb, startValue, e) {
        this.fireEvent('dragstart', this, slider, startValue, e);
    },
    onSliderDrag: function(slider, thumb, value, e) {
        var me = this;
        if (me.getLiveUpdate()) {
            me.setValue(value);
        }
        me.fireEvent('drag', me, slider, value, e);
    },
    onSliderDragEnd: function(slider, thumb, startValue, e) {
        this.fireEvent('dragend', this, slider, startValue, e);
    }
});

Ext.define('Ext.form.FieldSet', {
    extend: Ext.Container,
    xtype: 'fieldset',
    mixins: [
        Ext.form.Borders,
        Ext.mixin.FieldDefaults
    ],
    config: {
        title: null,
        instructions: null
    },
    autoSize: null,
    baseCls: Ext.baseCSSPrefix + 'form-fieldset',
    applyTitle: function(title) {
        if (typeof title === 'string') {
            title = {
                title: title
            };
        }
        Ext.applyIf(title, {
            docked: 'top',
            cls: this.baseCls + '-title'
        });
        return Ext.factory(title, Ext.Title, this._title);
    },
    updateTitle: function(newTitle, oldTitle) {
        if (newTitle) {
            this.add(newTitle);
        }
        if (oldTitle) {
            this.remove(oldTitle);
        }
    },
    getTitle: function() {
        var title = this._title;
        if (title && title instanceof Ext.Title) {
            return title.getTitle();
        }
        return title;
    },
    applyInstructions: function(instructions) {
        if (typeof instructions === 'string') {
            instructions = {
                title: instructions
            };
        }
        Ext.applyIf(instructions, {
            docked: 'bottom',
            cls: this.baseCls + '-instructions'
        });
        return Ext.factory(instructions, Ext.Title, this._instructions);
    },
    updateInstructions: function(newInstructions, oldInstructions) {
        if (newInstructions) {
            this.add(newInstructions);
        }
        if (oldInstructions) {
            this.remove(oldInstructions);
        }
    },
    getInstructions: function() {
        var instructions = this._instructions;
        if (instructions && instructions instanceof Ext.Title) {
            return instructions.getTitle();
        }
        return instructions;
    },
    updateDisabled: function(newDisabled) {
        this.query('field').forEach(function(field) {
            field.setDisabled(newDisabled);
        });
        return this;
    }
});

Ext.define('Ext.form.Panel', {
    extend: Ext.field.Panel,
    xtype: 'formpanel',
    isFormPanel: true,
    mixins: [
        Ext.mixin.FieldDefaults
    ],
    alternateClassName: 'Ext.form.FormPanel',
    classCls: Ext.baseCSSPrefix + 'formpanel',
    element: {
        reference: 'element',
        tag: 'form',
        novalidate: 'novalidate'
    },
    config: {
        enableSubmissionForm: true,
        enctype: null,
        method: 'post',
        multipartDetection: true,
        standardSubmit: false,
        submitOnAction: false,
        trackResetOnLoad: false
    },
    getTemplate: function() {
        var template = this.callParent();
        template.push({
            tag: 'input',
            type: 'submit',
            cls: Ext.baseCSSPrefix + 'hidden-submit'
        });
        return template;
    },
    initialize: function() {
        this.callParent();
        this.element.on('submit', 'onSubmit', this);
    },
    applyEnctype: function(newValue) {
        var form = this.element.dom || null;
        if (form) {
            if (newValue) {
                form.setAttribute('enctype', newValue);
            } else {
                form.setAttribute('enctype');
            }
        }
    },
    onSubmit: function(event) {
        var me = this;
        if (event && !me.getStandardSubmit()) {
            event.stopEvent();
        } else {
            this.submit(null, event);
        }
    },
    updateSubmitOnAction: function(value) {
        this[value ? 'on' : 'un']({
            action: 'onFieldAction',
            scope: this
        });
    },
    onFieldAction: function(field) {
        if (this.getSubmitOnAction()) {
            field.blur();
            this.submit();
        }
    },
    submit: function(options, e) {
        var me = this,
            formValues, form;
        options = options || {};
        formValues = me.getSubmitValues({
            enabled: me.getStandardSubmit() || !options.submitDisabled
        });
        form = me.element.dom || {};
        if (this.getEnableSubmissionForm()) {
            form = this.createSubmissionForm(form, formValues);
        }
        options = Ext.apply({
            url: me.getUrl() || form.action,
            submit: false,
            form: form,
            method: me.getMethod() || form.method || 'post',
            autoAbort: false,
            params: null,
            waitMsg: null,
            headers: null,
            success: null,
            failure: null
        }, options || {});
        return me.fireAction('beforesubmit', [
            me,
            formValues,
            options,
            e
        ], 'doBeforeSubmit', null, null, 'after');
    },
    privates: {
        applyExtraParams: function(options) {
            var form = options.form,
                params = Ext.merge(this.getBaseParams() || {}, options.params),
                name, input;
            for (name in params) {
                input = document.createElement('input');
                input.setAttribute('type', 'text');
                input.setAttribute('name', name);
                input.setAttribute('value', params[name]);
                form.appendChild(input);
            }
        },
        beforeAjaxSubmit: function(form, options, successFn, failureFn) {
            var me = this,
                url = options.url || me.getUrl(),
                request = Ext.merge({}, {
                    url: url,
                    timeout: me.getTimeout() * 1000,
                    form: form,
                    scope: me
                }, options),
                formValues = {},
                jsonSubmit = me.jsonSubmit,
                paramsKey = 'params',
                contentType = 'x-www-form-urlencoded; charset=UTF-8',
                original, placeholder, formData;
            delete request.success;
            delete request.failure;
            if (jsonSubmit) {
                paramsKey = 'jsonData';
                contentType = 'json';
                formValues = me.getSubmitValues({
                    enabled: me.getStandardSubmit() || !options.submitDisabled
                });
                delete request.params;
                delete request.form;
            }
            request[paramsKey] = Ext.merge({}, me.getBaseParams(), options.params, formValues);
            request.header = Ext.apply({
                'Content-Type': 'application/' + contentType
            }, options.headers || {});
            request.callback = function(callbackOptions, success, response) {
                var responseText = response.responseText,
                    responseXML = response.responseXML,
                    statusResult = Ext.data.request.Ajax.parseStatus(response.status, response);
                if (form.$fileswap) {
                    Ext.each(form.$fileswap, function(item) {
                        original = item.original;
                        placeholder = item.placeholder;
                        placeholder.parentNode.insertBefore(original, placeholder.nextSibling);
                        placeholder.parentNode.removeChild(placeholder);
                    });
                    form.$fileswap = null;
                    delete form.$fileswap;
                }
                me.setMasked(false);
                if (response.success === false) {
                    success = false;
                }
                if (success) {
                    if (statusResult && responseText && responseText.length === 0) {
                        success = true;
                    } else {
                        if (!Ext.isEmpty(response.responseBytes)) {
                            success = statusResult.success;
                        } else {
                            if (Ext.isString(responseText) && response.request.options.responseType === 'text') {
                                response.success = true;
                            } else if (Ext.isString(responseText)) {
                                try {
                                    response = Ext.decode(responseText);
                                } catch (e) {
                                    response.success = false;
                                    response.error = e;
                                    response.message = e.message;
                                }
                            } else if (Ext.isSimpleObject(responseText)) {
                                response = responseText;
                                Ext.applyIf(response, {
                                    success: true
                                });
                            }
                            if (!Ext.isEmpty(responseXML)) {
                                response.success = true;
                            }
                            success = !!response.success;
                        }
                    }
                    if (success) {
                        successFn(response, responseText);
                    } else {
                        failureFn(response, responseText);
                    }
                } else {
                    failureFn(response, responseText);
                }
            };
            if (Ext.feature.has.XHR2 && request.xhr2) {
                delete request.form;
                formData = request.data = new FormData(form);
                if (request.params) {
                    Ext.iterate(request.params, function(name, value) {
                        if (Ext.isArray(value)) {
                            Ext.each(value, function(v) {
                                formData.append(name, v);
                            });
                        } else {
                            formData.append(name, value);
                        }
                    });
                    delete request.params;
                }
            }
            return Ext.Ajax.request(request);
        },
        beforeDirectSubmit: function(api, form, options, successFn, failureFn) {
            var me = this,
                submit;
            me.applyExtraParams(options);
            api = Ext.direct.Manager.resolveApi(api, me);
            me.setApi(api);
            submit = api.submit;
            if (!submit) {
                Ext.raise('Cannot find Ext Direct API method for submit action');
            }
            return submit(form, function(data, response, success) {
                me.setMasked(false);
                if (success) {
                    if (data.success) {
                        successFn(response, data);
                    } else {
                        failureFn(response, data);
                    }
                } else {
                    failureFn(response, data);
                }
            }, me);
        },
        beforeStandardSubmit: function(form, options) {
            var field, fields, ln, body, i;
            if (options.url && Ext.isEmpty(form.action)) {
                form.action = options.url;
            }
            fields = this.query('spinnerfield');
            ln = fields.length;
            body = document.body;
            for (i = 0; i < ln; i++) {
                field = fields[i];
                if (!field.getDisabled()) {
                    field.setDisabled(false);
                }
            }
            body.appendChild(form);
            form.method = (options.method || form.method).toLowerCase();
            form.submit();
            body.removeChild(form);
        },
        createSubmissionForm: function(form, values) {
            var fields = this.getFields(),
                name, input, field, fileTrigger, inputDom;
            if (form.nodeType === 1) {
                form = form.cloneNode(false);
                for (name in values) {
                    input = document.createElement('input');
                    input.setAttribute('type', 'text');
                    input.setAttribute('name', name);
                    input.setAttribute('value', values[name]);
                    form.appendChild(input);
                }
            }
            for (name in fields) {
                if (fields.hasOwnProperty(name)) {
                    field = fields[name];
                    if (field.isFile) {
                        fileTrigger = field.getTriggers().file;
                        inputDom = fileTrigger && fileTrigger.getComponent().buttonElement.dom;
                        if (inputDom) {
                            if (!form.$fileswap) {
                                form.$fileswap = [];
                            }
                            input = inputDom.cloneNode(true);
                            inputDom.parentNode.insertBefore(input, inputDom.nextSibling);
                            form.appendChild(inputDom);
                            form.$fileswap.push({
                                original: inputDom,
                                placeholder: input
                            });
                        }
                    } else if (field.isPassword) {
                        if (field.getInputType() !== 'password') {
                            field.setRevealed(false);
                        }
                    }
                }
            }
            return form;
        },
        doBeforeSubmit: function(me, formValues, options) {
            var form = options.form || {},
                multipartDetected = false,
                api, scope, ret, successFn, failureFn, waitMsg;
            if (this.getMultipartDetection() === true) {
                this.getFields(false).forEach(function(field) {
                    if (field.isFile === true) {
                        multipartDetected = true;
                        return false;
                    }
                });
                if (multipartDetected) {
                    form.setAttribute('enctype', 'multipart/form-data');
                }
            }
            if (options.enctype) {
                form.setAttribute('enctype', options.enctype);
            }
            if (me.getStandardSubmit()) {
                ret = me.beforeStandardSubmit(form, options);
            } else {
                api = me.getApi();
                scope = options.scope || me;
                failureFn = function(response, responseText) {
                    if (Ext.isFunction(options.failure)) {
                        options.failure.call(scope, me, response, responseText);
                    }
                    me.fireEvent('exception', me, response);
                };
                successFn = function(response, responseText) {
                    if (Ext.isFunction(options.success)) {
                        options.success.call(options.scope || me, me, response, responseText);
                    }
                    me.fireEvent('submit', me, response);
                };
                waitMsg = options.waitMsg;
                if (options.waitMsg) {
                    if (typeof waitMsg === 'string') {
                        waitMsg = {
                            xtype: 'loadmask',
                            message: waitMsg
                        };
                    }
                    me.setMasked(waitMsg);
                }
                if (api) {
                    ret = me.beforeDirectSubmit(api, form, options, successFn, failureFn);
                } else {
                    ret = me.beforeAjaxSubmit(form, options, successFn, failureFn);
                }
            }
            return ret;
        }
    }
});

Ext.define('Ext.grid.CellEditor', {
    extend: Ext.Editor,
    xtype: 'celleditor',
    isCellEditor: true,
    floated: false,
    classCls: Ext.baseCSSPrefix + 'celleditor',
    config: {
        autoPin: true
    },
    relayedEvents: [
        'beforestartedit',
        'startedit',
        'beforecomplete',
        'complete',
        'canceledit',
        'specialkey'
    ],
    swallowKeys: false,
    layout: 'fit',
    shadow: false,
    allowBlur: true,
    alignment: 'tl-tl',
    zIndex: 10,
    useBoundValue: false,
    inheritUi: true,
    field: {
        inheritUi: true
    },
    constructor: function(config) {
        var me = this,
            grid;
        me.callParent([
            config
        ]);
        if (config.plugin) {
            grid = config.plugin.getGrid();
        }
        if (grid) {
            grid.relayEvents(me, me.relayedEvents);
        }
    },
    beforeEdit: function(el, value) {
        var me = this,
            ret;
        ret = me.callParent([
            el,
            value
        ]);
        if (ret !== false) {
            ret = me.$activeLocation.beforeEdit(me);
        }
        return ret;
    },
    startEdit: function(location, value, doFocus) {
        var me = this,
            cell, el, row, grid, result;
        if (location) {
            cell = location.cell;
            el = cell.el;
            value = value != null ? value : location.record.get(cell.dataIndex);
            me.$activeLocation = location;
            me.ownerCmp = cell;
            me.render(el);
            me.callParent([
                el,
                value,
                doFocus
            ]);
            if (me.editing) {
                me.$activeRow = row = location.row;
                me.$activeGrid = grid = row.getGrid();
                me.editingPlugin.editing = true;
                me.editingPlugin.location = me.$activeLocation = result = new Ext.grid.Location(grid, me.getField().getFocusEl());
                me.editingPlugin.activeEditor = me;
                grid.stickItem(row, {
                    autoPin: me.getAutoPin()
                });
            } else {
                me.$activeLocation = null;
            }
        }
        return result;
    },
    onFocusLeave: function(e) {
        if (!this.editingPlugin.getGrid().destroying) {
            if (this.isCancelling) {
                this.cancelEdit();
            } else {
                this.completeEdit(false);
            }
        }
        this.isCancelling = false;
    },
    onFocusEnter: function(e) {
        if (this.$activeLocation) {
            e.relatedTarget = e.fromElement = this.$activeLocation.getFocusEl('dom');
        }
        this.callParent([
            e
        ]);
    },
    getLocation: function() {
        return this.$activeLocation;
    },
    onSpecialKey: function(field, event) {
        var me = this;
        if (event.getKey() === event.ESC) {
            me.isCancelling = true;
        } else {
            me.callParent([
                field,
                event
            ]);
        }
    },
    onEditComplete: function(remainVisible, cancelling) {
        var me = this,
            location = me.$activeLocation,
            value = me.getValue(),
            record, dataIndex, row, grid, sticky;
        me.callParent([
            remainVisible,
            cancelling
        ]);
        if (location) {
            grid = location.row.getGrid();
            if (!cancelling && value !== me.startValue) {
                record = location.record;
                dataIndex = location.cell.dataIndex;
                if (record) {
                    record.set(dataIndex, value);
                    grid.ensureVisible(location.record);
                    location.refresh();
                }
            }
            if (!remainVisible) {
                row = location.row;
                sticky = !!row.$sticky;
                if (sticky) {
                    grid.stickItem(row, null);
                    grid.ensureVisible(location.record, {
                        column: location.columnIndex,
                        focus: true
                    });
                }
                me.$stickyVisibility = me.$activeLocation = me.$activeRow = me.$activeGrid = null;
                me.editingPlugin.editing = false;
                me.editingPlugin.location = me.editingPlugin.activeEditor = null;
            }
        }
    },
    realign: Ext.emptyFn,
    toggleBoundEl: function(visible) {
        var location = this.$activeLocation,
            cell, bodyEl;
        if (location && this.hideEl) {
            cell = location.cell;
            if (cell) {
                bodyEl = cell.bodyElement;
                bodyEl.setVisibility(visible);
            }
        }
    }
});

Ext.define('Ext.grid.Location', {
    extend: Ext.dataview.Location,
    isGridLocation: true,
    actionable: false,
    cell: null,
    column: null,
    columnIndex: -1,
    summary: false,
    row: null,
    rowBody: null,
    isTreeLocation: false,
    inheritableStatics: {
        defineProtoProperty: function(propName, getterName) {
            Object.defineProperty(this.prototype, propName, {
                get: function() {
                    var v = this[getterName]();
                    Object.defineProperty(this, propName, {
                        value: v,
                        configurable: true
                    });
                    return v;
                }
            });
        }
    },
    attach: function(source) {
        var me = this,
            view = me.view,
            store = view.store,
            item, cell, column, columns, sourceRec, sourceCol, first;
        if (source.constructor === Object) {
            sourceRec = source.record;
            if (typeof sourceRec === 'number') {
                sourceRec = store.getAt(Math.max(Math.min(sourceRec, store.getCount() - 1), 0));
            }
            sourceCol = source.column;
            if (typeof sourceCol === 'number') {
                columns = view.getVisibleColumns();
                sourceCol = columns[Math.max(Math.min(sourceCol, columns.length - 1), 0)];
            }
            if (!(sourceRec && sourceCol)) {
                if (sourceRec) {
                    sourceCol = view.getFirstVisibleColumn();
                } else {
                    sourceRec = store.getAt(0);
                }
            }
            cell = view.mapToCell(sourceRec, sourceCol);
            if (cell) {
                source = cell.element;
            } else {
                me._setColumn(sourceCol);
                source = sourceRec;
            }
        }
        me.callParent([
            source
        ]);
        item = me.item;
        if (item && item.isGridRow) {
            me.row = item;
            me.summary = item.isSummaryRow;
            if (!cell) {
                cell = view.mapToCell(source);
                if (!cell) {
                    columns = view.getVisibleColumns();
                    first = columns[0];
                    if (first) {
                        cell = item.getCellByColumn(first);
                    }
                }
            }
            me.cell = cell;
            if (cell) {
                me.column = column = cell.getColumn();
                columns = columns || view.getVisibleColumns();
                me.columnIndex = columns.indexOf(column);
                me.isTreeLocation = !!cell.isTreeCell;
            } else {
                me.rowBody = view.mapToRowBody(source);
            }
        }
    },
    beforeEdit: function(editor) {
        return this.fireEditEvent('beforeedit', editor);
    },
    fireEditEvent: function(eventName, editor) {
        var me = this,
            view = me.view;
        if (editor) {
            me.editor = editor;
        }
        return view.fireEvent(eventName, view, me);
    },
    clone: function(options) {
        var me = this,
            ret = me.callParent(),
            record, column, cell;
        if (options) {
            if (options.record !== undefined) {
                record = options.record;
            }
            if (options.column !== undefined) {
                column = options.column;
            }
            delete ret.sourceElement;
        }
        if (record != null) {
            delete me.source;
            me.superclass.attach.call(ret, record);
            ret.row = ret.item;
        } else {
            ret.row = ret.child = me.row;
            ret.summary = me.summary;
            ret.rowBody = me.rowBody;
        }
        if (column != null) {
            ret._setColumn(column);
        } else {
            ret.cell = cell = me.cell;
            ret.column = me.column;
            ret.columnIndex = me.columnIndex;
            me.isTreeLocation = !!(cell && cell.isTreeCell);
        }
        return ret;
    },
    cloneForColumn: function(column) {
        return this.clone({
            column: column
        });
    },
    equals: function(other) {
        var me = this;
        if (other && other.view === me.view && other.isGridLocation) {
            if (me.actionable !== other.actionable) {
                return false;
            }
            if (me.sourceElement && me.actionable) {
                return other.sourceElement === me.sourceElement;
            }
            if ((me.recordIndex !== other.recordIndex) || me.record !== other.record) {
                return false;
            }
            return me.column === other.column;
        }
        return false;
    },
    equalCell: function(other) {
        var me = this;
        return other && other.view === me.view && other.isGridLocation && me.recordIndex === other.recordIndex && me.column === other.column;
    },
    getFocusEl: function(as) {
        var me = this,
            ret;
        if (me.actionable) {
            ret = me.sourceElement;
        } else {
            ret = me.get();
            ret = ret && !ret.destroyed && ret.el.dom;
        }
        return Ext.getBody().contains(ret) ? me.as(ret, as || 'el') : null;
    },
    getCell: function(as) {
        var result = this.cell,
            ret = null;
        if (result) {
            ret = (as === 'dom' || as === true) ? result.el.dom : (as === 'cmp' ? result : result.el);
        }
        return ret;
    },
    get: function() {
        return this.cell;
    },
    isFirstColumn: function() {
        var column = this.column,
            ret = false;
        if (column) {
            ret = this.view.isFirstVisibleColumn(column);
        }
        return ret;
    },
    isLastColumn: function() {
        var column = this.column,
            ret = false;
        if (column) {
            ret = this.view.isLastVisibleColumn(column);
        }
        return ret;
    },
    refresh: function() {
        var me = this,
            column = me.column,
            oldColumnIndex = me.columnIndex,
            newColumnIndex = me.view.getHeaderContainer().indexOfLeaf(column),
            location;
        if (newColumnIndex === -1) {
            newColumnIndex = (oldColumnIndex === -1) ? 0 : oldColumnIndex;
        }
        location = me.callParent();
        return location._setColumn(newColumnIndex);
    },
    next: function(options) {
        var me = this,
            candidate;
        if (me.actionable) {
            return me.navigate();
        } else {
            for (candidate = me.nextCell(options); candidate && !candidate.get().el.isFocusable(); candidate = candidate.nextCell(options)) {}
            return candidate || me;
        }
    },
    previous: function(options) {
        var me = this,
            candidate;
        if (me.actionable) {
            return me.navigate(true);
        } else {
            for (candidate = me.previousCell(options); candidate && !candidate.get().el.isFocusable(); candidate = candidate.previousCell(options)) {}
            return candidate || me;
        }
    },
    down: function(options) {
        var me = this,
            column = options && options.column || me.column,
            candidate = me.nextItem(options),
            cell;
        if (candidate) {
            candidate._setColumn(column);
            cell = candidate.get();
            while (candidate && (!cell || !cell.el.isFocusable())) {
                candidate = candidate.nextItem(options);
                if (candidate) {
                    candidate._setColumn(column);
                    cell = candidate.get();
                }
            }
            if (candidate && !candidate.equals(me)) {
                return candidate;
            }
        }
        return me;
    },
    up: function(options) {
        var me = this,
            column = options && options.column || me.column,
            candidate = me.previousItem(options),
            cell;
        if (candidate) {
            candidate._setColumn(column);
            cell = candidate.get();
            while (candidate && (!cell || !cell.el.isFocusable())) {
                candidate = candidate.previousItem(options);
                if (candidate) {
                    candidate._setColumn(column);
                    cell = candidate.get();
                }
            }
        }
        if (candidate && !candidate.equals(me)) {
            return candidate;
        }
        return me;
    },
    privates: {
        determineActionable: function() {
            var target = this.sourceElement,
                cell = this.cell,
                actionable = false;
            if (target && (!cell || cell.destroyed || cell.element.dom !== target)) {
                actionable = Ext.fly(target).isFocusable(true);
            }
            return actionable;
        },
        navigate: function(reverse) {
            var me = this,
                activeEl = me.sourceElement,
                view = me.view,
                scrollable = view.getScrollable(),
                actionables = view.getNavigationModel().actionables,
                len = actionables && actionables.length,
                candidate = me.clone(),
                previousCandidate = me.clone(),
                testEl,
                visitOptions = {
                    callback: function(el) {
                        testEl = Ext.fly(el);
                        if (!testEl.$isFocusTrap && testEl.isFocusable()) {
                            component = Ext.Component.from(el);
                            if (!component || !component.getDisabled()) {
                                focusables.push(el);
                            }
                        }
                    },
                    reverse: reverse,
                    skipSelf: true
                },
                focusables = [],
                i, result, component;
            while (candidate && !result && candidate.get()) {
                focusables.length = 0;
                candidate.get().el.visit(visitOptions);
                activeEl = focusables[activeEl ? (Ext.Array.indexOf(focusables, activeEl) + 1) : 0];
                if (activeEl) {
                    result = candidate;
                    result.source = result.sourceElement = activeEl;
                    delete result.actionable;
                    if (candidate.child) {
                        scrollable.ensureVisible(candidate.child.el);
                    }
                    scrollable.ensureVisible(activeEl);
                    activeEl.focus();
                } else {
                    candidate = candidate[reverse ? 'previousCell' : 'nextCell']();
                    if (candidate.equals(previousCandidate)) {
                        return me;
                    }
                    if (candidate && len) {
                        for (i = 0; !result && i < len; i++) {
                            view.ensureVisible(candidate.record, {
                                column: candidate.columnIndex,
                                focus: true
                            });
                            result = actionables[i].activateCell(candidate);
                        }
                    }
                }
                previousCandidate = candidate;
            }
            return result || me;
        },
        activate: function() {
            var me = this,
                view = me.view,
                scrollable = view.getScrollable(),
                actionables = view.getNavigationModel().actionables,
                len = actionables && actionables.length,
                candidate = me.clone(),
                activeEl, i, result;
            candidate.get().el.visit({
                callback: function(el) {
                    if (Ext.fly(el).isFocusable()) {
                        activeEl = el;
                        return false;
                    }
                },
                skipSelf: true
            });
            if (activeEl) {
                result = candidate;
                result.source = result.sourceElement = activeEl;
                delete result.actionable;
                if (candidate.child) {
                    scrollable.ensureVisible(candidate.child.el);
                }
                scrollable.ensureVisible(activeEl);
                activeEl.focus();
            } else {
                for (i = 0; !result && i < len; i++) {
                    result = actionables[i].activateCell(candidate);
                }
            }
            return result;
        },
        getFocusables: function() {
            var focusables = [],
                element = this.sourceElement;
            if (element) {
                Ext.fly(element).visit({
                    callback: function(el) {
                        if (Ext.fly(el).isFocusable()) {
                            focusables.push(el);
                        }
                    },
                    skipSelf: true
                });
            }
            return focusables;
        },
        nextCell: function(options) {
            var me = this,
                startPoint = me.clone(),
                result = me.clone(),
                columns = me.getVisibleColumns(),
                rowIndex = me.view.store.indexOf(me.row.getRecord()),
                targetIndex,
                wrap = false;
            if (options) {
                if (typeof options === 'boolean') {
                    wrap = options;
                } else {
                    wrap = options.wrap;
                }
            }
            do {
                targetIndex = columns.indexOf(result.column) + 1;
                if (targetIndex === columns.length || !me.child.isGridRow) {
                    if (rowIndex < me.view.store.getData().count() - 1) {
                        result = me.getUpdatedLocation(columns[0], rowIndex + 1);
                    } else if (wrap) {
                        result = me.getUpdatedLocation(columns[0], 0);
                    }
                } else {
                    result = me.getUpdatedLocation(columns[targetIndex], rowIndex);
                }
                if (result && result.equals(startPoint)) {
                    break;
                }
                if (!result) {
                    result = startPoint;
                    break;
                }
            } while (result && !result.sourceElement);
            return result;
        },
        getVisibleColumns: function() {
            var me = this,
                view = me.view,
                partners = view.allPartners || [
                    view
                ],
                partnerLen = partners.length,
                i,
                visibleColumns = [];
            for (i = 0; i < partnerLen; i++) {
                visibleColumns = visibleColumns.concat(partners[i].getVisibleColumns());
            }
            return visibleColumns;
        },
        previousCell: function(options) {
            var me = this,
                startPoint = me.clone(),
                result = me.clone(),
                columns = me.getVisibleColumns(),
                rowIndex = me.view.store.indexOf(me.row.getRecord()),
                targetIndex,
                wrap = false;
            if (options) {
                if (typeof options === 'boolean') {
                    wrap = options;
                } else {
                    wrap = options.wrap;
                }
            }
            do {
                targetIndex = columns.indexOf(result.column) - 1;
                if (targetIndex === -1 || !me.child.isGridRow) {
                    if (rowIndex > 0) {
                        result = me.getUpdatedLocation(columns[columns.length - 1], rowIndex - 1);
                    } else if (wrap) {
                        result = me.getUpdatedLocation(columns[columns.length - 1], me.view.store.getData().count() - 1);
                    }
                } else {
                    result = me.getUpdatedLocation(columns[targetIndex], rowIndex);
                }
                if (result && result.equals(startPoint)) {
                    break;
                }
                if (!result) {
                    result = startPoint;
                    break;
                }
            } while (result && !result.sourceElement);
            return result;
        },
        getUpdatedLocation: function(column, targetRowIndex) {
            var me = this,
                grid = column.getGrid(),
                targetRecord = me.view.store.getData().getAt(targetRowIndex),
                location = grid.createLocation(targetRecord);
            location.column = column;
            location.columnIndex = grid.getVisibleColumns().indexOf(column);
            location.cell = location.row && location.row.getCellByColumn(column);
            if (location.cell) {
                delete me.event;
                delete me.actionable;
                location.isTreeLocation = !!location.cell.isTreeCell;
                location.sourceElement = location.cell.el.dom;
                return location;
            } else {
                return null;
            }
        },
        _setColumn: function(column) {
            var me = this,
                columns = me.view.getVisibleColumns(),
                index;
            if (typeof column === 'number') {
                index = column;
                column = columns[index];
            } else {
                index = columns.indexOf(column);
            }
            delete me.event;
            delete me.actionable;
            me.column = column;
            me.columnIndex = index;
            me.cell = me.row && me.row.getCellByColumn(column);
            if (me.cell) {
                me.isTreeLocation = !!me.cell.isTreeCell;
                me.sourceElement = me.cell.el.dom;
            }
            return me;
        }
    }
}, function(Cls) {
    Cls.defineProtoProperty('actionable', 'determineActionable');
});

Ext.define('Ext.grid.NavigationModel', {
    extend: Ext.dataview.NavigationModel,
    alias: 'navmodel.grid',
    locationClass: 'Ext.grid.Location',
    statics: {
        ignoreInputFieldKeys: {
            PAGE_UP: true,
            PAGE_DOWN: true,
            END: true,
            HOME: true,
            LEFT: true,
            UP: true,
            RIGHT: true,
            DOWN: true
        }
    },
    setLocation: function(location, options) {
        var me = this,
            view = me.getView(),
            event = options && options.event;
        me.columnIndex = -1;
        if (location != null && !location.isGridLocation) {
            if (Ext.isArray(location)) {
                location = {
                    column: location[0],
                    record: location[1]
                };
            } else if (typeof location === 'number') {
                location = view.store.getAt(location);
            }
            location = me.createLocation(location);
            if (event) {
                location.event = event;
            }
        }
        return me.callParent([
            location,
            options
        ]);
    },
    clearLocation: function() {
        var me = this,
            item;
        if (me.location) {
            me.previousLocation = me.location;
            item = me.location.sourceElement;
            if (item) {
                Ext.fly(item).removeCls(me.focusedCls);
            }
            me.location = null;
        }
    },
    registerActionable: function(actionable) {
        var me = this,
            view = me.getView(),
            actionables = me.actionables || (me.actionables = []),
            triggerEvent, listeners;
        if (!Ext.Array.contains(actionables, actionable)) {
            actionables.push(actionable);
            triggerEvent = actionable.getTriggerEvent();
            if (triggerEvent) {
                listeners = {
                    scope: me,
                    args: [
                        actionable
                    ]
                };
                listeners[triggerEvent] = 'triggerActionable';
                actionable.triggerEventListener = view.bodyElement.on(listeners);
            }
        }
    },
    unregisterActionable: function(actionable) {
        var actionables = this.actionables;
        if (actionables) {
            Ext.Array.remove(actionables, actionable);
        }
    },
    privates: {
        onFocusMove: function(e) {
            var me = this,
                view = me.getView(),
                location = me.getLocation();
            if (e.toElement === view.el.dom && location) {
                me.clearLocation();
                return me.setLocation(location);
            }
            location = me.createLocation(e);
            if (!location.equals(me.location)) {
                me.handleLocationChange(location, {
                    event: e,
                    navigate: false
                });
            }
        },
        processViewEvent: function(e) {
            var me = this,
                view = me.getView(),
                cell = view.mapToCell(e);
            if (Ext.fly(e.target).isInputField() && me.self.ignoreInputFieldKeys[e.getKeyName()]) {
                return false;
            }
            if (cell && cell.row.grid === view) {
                return e;
            }
        },
        activateCell: function(location) {
            location.clone().activate();
        },
        triggerActionable: function(actionable, e) {
            var actionLocation;
            actionLocation = actionable.activateCell(this.createLocation(e));
            if (actionLocation) {
                this.setLocation(actionLocation);
            }
        },
        onChildTouchStart: function(view, location) {
            var e = location.event;
            if (location.header || location.footer) {
                e.preventDefault();
            } else {
                if (this.location && !this.location.equalCell(location)) {
                    this.setLocation(location, {
                        event: location.event,
                        navigate: this.getView().getTriggerEvent() === 'childtouchstart'
                    });
                }
            }
        },
        onKeyUp: function(e) {
            e.preventDefault();
            if (!this.location.actionable) {
                if (this.location) {
                    this.moveUp(e);
                } else {
                    this.setLocation(0);
                }
            }
        },
        onKeyDown: function(e) {
            e.preventDefault();
            if (!this.location.actionable) {
                if (this.location) {
                    this.moveDown(e);
                } else {
                    this.setLocation(0);
                }
            }
        },
        onKeyLeft: function(e) {
            var location = this.location,
                isSimpleTree = location.isLastColumn() && location.isFirstColumn();
            if (!location.actionable) {
                e.preventDefault();
                if (location.isTreeLocation && !location.record.isLeaf() && location.record.isExpanded()) {
                    if (isSimpleTree === !e.ctrlKey) {
                        return location.cell.collapse();
                    }
                }
                if (!(e.shiftKey && location.isFirstColumn())) {
                    this.movePrevious({
                        event: e
                    });
                }
            }
            else if (Ext.fly(e.target).isInputField()) {
                return true;
            }
        },
        onKeyRight: function(e) {
            var location = this.location,
                isSimpleTree = location.isLastColumn() && location.isFirstColumn();
            if (!location.actionable) {
                e.preventDefault();
                if (location.isTreeLocation && !location.record.isLeaf() && !location.record.isExpanded()) {
                    if (isSimpleTree === !e.ctrlKey) {
                        return location.cell.expand();
                    }
                }
                if (!(e.shiftKey && location.isLastColumn())) {
                    this.moveNext({
                        event: e
                    });
                }
            }
            else if (Ext.fly(e.target).isInputField()) {
                return true;
            }
        },
        onKeyF2: function(e) {
            if (this.location.actionable) {
                this.onKeyEsc();
            } else {
                this.activateCell(this.location);
            }
        },
        onKeyEsc: function(e) {
            if (this.location.actionable) {
                this.location.get().el.focus();
            }
        },
        onKeyTab: function(e) {
            var me = this,
                location = me.location,
                navigate;
            if (location.actionable) {
                navigate = function() {
                    me.location = e.shiftKey ? location.previous() : location.next();
                };
                navigate();
            } else {
                return true;
            }
        },
        onKeyPageDown: function(e) {
            var me = this,
                view, y, candidate;
            e.preventDefault();
            if (!me.location.actionable) {
                view = me.getView();
                y = (view.infinite ? view.getItemTop(me.location.child) : me.location.child.el.dom.offsetTop) + view.getVisibleHeight();
                candidate = view.getRecordIndexFromPoint(0, y);
                view.ensureVisible(candidate).then(function() {
                    candidate = new Ext.grid.Location(view, {
                        record: candidate,
                        column: me.location.column
                    });
                    if (!(candidate.sourceElement && Ext.fly(candidate.sourceElement).isFocusable())) {
                        candidate = candidate.up();
                    }
                    me.setLocation(candidate, {
                        event: e
                    });
                });
            }
        },
        onKeyPageUp: function(e) {
            var me = this,
                view, y, candidate;
            e.preventDefault();
            if (!me.location.actionable) {
                view = me.getView();
                y = (view.infinite ? view.getItemTop(me.location.child) : me.location.child.el.dom.offsetTop) - view.getVisibleHeight();
                candidate = view.getRecordIndexFromPoint(0, y);
                view.ensureVisible(candidate).then(function() {
                    candidate = new Ext.grid.Location(view, {
                        record: candidate,
                        column: me.location.column
                    });
                    if (!(candidate.sourceElement && Ext.fly(candidate.sourceElement).isFocusable())) {
                        candidate = candidate.down();
                    }
                    me.setLocation(candidate, {
                        event: e
                    });
                });
            }
        },
        onKeyHome: function(e) {
            e.preventDefault();
            if (!this.location.actionable) {
                if (e.ctrlKey) {
                    this.setLocation({
                        record: this.getView().getStore().first(),
                        column: this.location.column
                    }, {
                        event: e
                    });
                } else {
                    this.setLocation({
                        record: this.location.record,
                        column: this.getView().getFirstVisibleColumn()
                    }, {
                        event: e
                    });
                }
            }
        },
        onKeyEnd: function(e) {
            e.preventDefault();
            if (!this.location.actionable) {
                if (e.ctrlKey) {
                    this.setLocation({
                        record: this.getView().getStore().last(),
                        column: this.location.column
                    }, {
                        event: e
                    });
                } else {
                    this.setLocation({
                        record: this.location.record,
                        column: this.getView().getLastVisibleColumn()
                    }, {
                        event: e
                    });
                }
            }
        },
        onKeySpace: function(e) {
            var target = Ext.fly(e.target),
                events, focusables, result;
            this.onNavigate(e);
            if (!this.location.actionable) {
                focusables = this.location.getFocusables();
                if (focusables.length) {
                    events = Ext.get(focusables[0]).events;
                }
            } else {
                if (target.isInputField()) {
                    result = true;
                } else {
                    events = target.events;
                }
            }
            if (events) {
                if (events.tap) {
                    events.tap.fire(e);
                }
                if (events.click) {
                    events.click.fire(e);
                }
            }
            return result;
        },
        onKeyEnter: function(e) {
            var l = this.location;
            e.stopEvent();
            if (!l.actionable) {
                if (l.isTreeLocation && l.record.data.checked != null) {
                    l.record.set('checked', !l.record.data.checked);
                } else {
                    this.activateCell(l);
                }
            } else {
                this.onKeySpace(e);
            }
        },
        onSelectAllKeyPress: function(e) {
            if (Ext.fly(e.target).isInputField()) {
                return true;
            } else {
                return this.callParent([
                    e
                ]);
            }
        },
        moveUp: function(e) {
            var location = this.getLocation();
            if (location) {
                location = location.up();
                if (location) {
                    this.setLocation(location, {
                        event: e
                    });
                }
            }
        },
        moveDown: function(e) {
            var location = this.getLocation();
            if (location) {
                location = location.down();
                if (location) {
                    this.setLocation(location, {
                        event: e
                    });
                }
            }
        }
    }
});

Ext.define('Ext.grid.cell.Base', {
    extend: Ext.Widget,
    xtype: 'gridcellbase',
    isGridCell: true,
    mixins: [
        Ext.mixin.Toolable
    ],
    cachedConfig: {
        align: null,
        cls: null,
        bodyCls: null,
        bodyStyle: null,
        cellCls: null,
        selectable: null
    },
    config: {
        column: null,
        hidden: false,
        record: null,
        value: null
    },
    classCls: Ext.baseCSSPrefix + 'gridcell',
    dirtyCls: Ext.baseCSSPrefix + 'dirty',
    alignCls: {
        left: Ext.baseCSSPrefix + 'align-left',
        center: Ext.baseCSSPrefix + 'align-center',
        right: Ext.baseCSSPrefix + 'align-right'
    },
    inheritUi: true,
    cellSelector: '.' + Ext.baseCSSPrefix + 'gridcell',
    defaultBindProperty: 'value',
    toolDefaults: {
        zone: 'head',
        ui: 'gridcell'
    },
    getTemplate: function() {
        var template = {
                reference: 'bodyElement',
                cls: Ext.baseCSSPrefix + 'body-el',
                uiCls: 'body-el'
            };
        if (!(template.children = this.innerTemplate)) {
            template.html = '\xa0';
        }
        return [
            template
        ];
    },
    doDestroy: function() {
        this.setColumn(null);
        this.setRecord(null);
        this.mixins.toolable.doDestroy.call(this);
        this.callParent();
    },
    getComputedWidth: function() {
        return this.getHidden() ? 0 : this.getWidth();
    },
    updateAlign: function(align, oldAlign) {
        var me = this,
            alignCls = me.alignCls;
        if (oldAlign) {
            me.removeCls(alignCls[oldAlign]);
        }
        if (align) {
            if (!alignCls[align]) {
                Ext.raise("Invalid value for align: '" + align + "'");
            }
            me.addCls(alignCls[align]);
        }
        me.syncToolableAlign();
    },
    updateBodyCls: function(cellCls, oldCellCls) {
        if (cellCls || oldCellCls) {
            this.bodyElement.replaceCls(oldCellCls, cellCls);
        }
    },
    updateBodyStyle: function(style) {
        this.bodyElement.applyStyles(style);
    },
    updateCellCls: function(cls, oldCls) {
        this.element.replaceCls(oldCls, cls);
    },
    updateCls: function(cls, oldCls) {
        this.element.replaceCls(oldCls, cls);
    },
    updateColumn: function(column) {
        var dataIndex = null,
            row = this.row;
        if (column) {
            dataIndex = ((row && row.isSummaryRow) && column.getSummaryDataIndex()) || column.getDataIndex();
        }
        this.dataIndex = dataIndex;
    },
    updateRecord: function() {
        if (!this.destroyed && !this.destroying) {
            this.refresh();
        }
    },
    updateSelectable: function(value) {
        this.toggleCls(Ext.baseCSSPrefix + 'item-no-select', value === false);
    },
    refresh: function(ctx) {
        var me = this,
            was = me.refreshContext,
            context, modified, value;
        if (!me.isBound('value')) {
            ctx = ctx || was;
            modified = ctx && ctx.modified;
            if (!modified || me.bound(modified)) {
                me.refreshContext = context = me.beginRefresh(ctx);
                value = me.refreshValue(context);
                if (value !== me.getValue()) {
                    me.setValue(value);
                } else if (me.writeValue) {
                    me.writeValue();
                }
                me.refreshContext = was;
            }
        }
    },
    refreshValue: function(context) {
        var me = this,
            record = context.record,
            dataIndex = context.dataIndex,
            value, dirty, modified;
        if (context.summary) {
            value = me.summarize(context);
        } else if (record && dataIndex) {
            value = record.get(dataIndex);
            modified = record.modified;
            dirty = !!(modified && modified.hasOwnProperty(dataIndex));
            if (dirty !== me.$dirty) {
                me.toggleCls(me.dirtyCls, dirty);
                me.$dirty = dirty;
            }
        }
        return value;
    },
    privates: {
        refreshCounter: 0,
        $dirty: false,
        refreshContext: null,
        storeMethodRe: /^(?:average|max|min|sum)$/,
        augmentToolHandler: function(tool, args) {
            var info = args[1] = {
                    event: args.pop(),
                    record: this.getRecord(),
                    column: this.getColumn(),
                    cell: args[0],
                    tool: args[1]
                };
            args[0] = info.grid = info.column.getGrid();
        },
        beginRefresh: function(context) {
            var me = this,
                column = me.getColumn(),
                row = me.row;
            context = context || (row ? row.beginRefresh() : {
                record: me.getRecord()
            });
            ++me.refreshCounter;
            context.from = context.from || 'cell';
            context.cell = me;
            context.column = column;
            context.dataIndex = me.dataIndex;
            context.scope = column.getScope();
            return context;
        },
        bound: function(fields) {
            return !!fields[this.dataIndex];
        },
        summarize: function(context) {
            var me = this,
                column = context.column,
                summaryType = column.getSummaryType(),
                dataIndex = context.dataIndex,
                group = context.group,
                store = context.store,
                records = context.records,
                value;
            if (summaryType) {
                if (!column.$warnSummaryType) {
                    column.$warnSummaryType = true;
                    Ext.log.warn('[column] summaryType is deprecated; use summaryRenderer (' + column.getId() + ')');
                }
                if (Ext.isFunction(summaryType)) {
                    value = summaryType.call(store, store.data.items.slice(), dataIndex);
                } else if (summaryType === 'count') {
                    value = store.getCount();
                } else if (me.storeMethodRe.test(summaryType)) {
                    value = store[summaryType](dataIndex);
                } else {
                    value = Ext.callback(summaryType, null, [
                        store.data.items.slice(),
                        dataIndex,
                        store
                    ], 0, me);
                }
            } else if (!(summaryType = column.getSummary())) {
                if (dataIndex) {
                    value = context.record.get(dataIndex);
                }
            }
            else if (!dataIndex) {
                Ext.raise('Cannot use summary config w/o summaryDataIndex or dataIndex (' + context.grid.getId() + ')');
            } else {
                if (group) {
                    if (group.isVirtualGroup) {
                        Ext.raise('Cannot calculate a group summary on a virtual store (' + context.grid.getId() + ')');
                    }
                } else if (store.getRemoteSort()) {
                    Ext.raise('Cannot calculate a summary on a remoteSort store (' + context.grid.getId() + ')');
                }
                value = summaryType.calculate(records, dataIndex, 'data', 0, records.length);
            }
            return value;
        }
    },
    deprecated: {
        '6.5': {
            configs: {
                innerStyle: 'bodyStyle',
                innerCls: 'bodyCls'
            }
        }
    }
});

Ext.define('Ext.grid.cell.Text', {
    extend: Ext.grid.cell.Base,
    xtype: 'textcell',
    config: {
        encodeHtml: true,
        rawValue: null,
        zeroValue: null
    },
    getTemplate: function() {
        var template = this.callParent();
        template[0]["data-qoverflow"] = true;
        return template;
    },
    formatValue: function(v) {
        var me = this,
            context = me.refreshContext,
            column = context.column,
            zeroValue = me.getZeroValue(),
            format = column.getFormatter(),
            renderer, scope;
        if (context.summary) {
            renderer = column.getSummaryRenderer();
            if (renderer) {
                format = null;
                scope = context.scope;
                if (typeof renderer === 'string') {
                    v = Ext.callback(renderer, scope, [
                        v,
                        context
                    ], 0, column);
                } else {
                    v = renderer.call(scope || me, v, context);
                }
            }
            format = column.getSummaryFormatter() || format;
        } else if (v === 0 && zeroValue !== null) {
            v = zeroValue;
            format = null;
        }
        if (format) {
            v = format(v);
        }
        if (v != null) {
            v = String(v);
        } else {
            v = '';
        }
        return v;
    },
    printValue: function(v) {
        var me = this,
            was = me.refreshContext,
            s;
        me.refreshContext = me.beginRefresh(was);
        s = me.formatValue(v);
        if (me.getEncodeHtml()) {
            s = Ext.htmlEncode(s);
        }
        me.refreshContext = was;
        return s;
    },
    updateRawValue: function(rawValue) {
        var dom = this.bodyElement.dom,
            value = rawValue == null ? '' : rawValue;
        if (this.getEncodeHtml()) {
            dom.textContent = value;
        } else {
            dom.innerHTML = value;
        }
    },
    updateValue: function() {
        var me = this,
            was = me.refreshContext,
            row = me.row;
        if (row && row.parent) {
            if (!was) {
                me.refreshContext = me.beginRefresh();
            }
            me.writeValue();
            me.refreshContext = was;
        }
    },
    updateZeroValue: function() {
        if (!this.isConfiguring) {
            this.refresh();
        }
    },
    writeValue: function() {
        var me = this,
            value = me.getValue();
        if (!(value = me.formatValue(value))) {
            value = me.getColumn().getEmptyText();
        }
        me.setRawValue(value);
    }
});

Ext.define('Ext.grid.cell.Cell', {
    extend: Ext.grid.cell.Text,
    xtype: 'gridcell',
    config: {
        tpl: null,
        renderer: null,
        formatter: null,
        scope: null
    },
    friendly: null,
    updateColumn: function(column, oldColumn) {
        var me = this,
            friendly = true,
            tpl, renderer, formatter;
        me.callParent([
            column,
            oldColumn
        ]);
        if (column) {
            tpl = column.getTpl();
            renderer = column.getRenderer();
            formatter = column.getFormatter();
            if (renderer !== null) {
                me.setRenderer(renderer);
                friendly = (typeof renderer === 'function') && renderer.length === 1;
            }
            if (tpl !== null) {
                me.setTpl(tpl);
                friendly = false;
            }
            if (formatter !== null) {
                me.setFormatter(formatter);
            }
            me.friendly = friendly;
        }
    },
    applyTpl: function(tpl) {
        return Ext.XTemplate.get(tpl);
    },
    applyFormatter: function(format) {
        var me = this,
            fmt = format,
            parser;
        if (typeof fmt === 'string') {
            parser = Ext.app.bind.Parser.fly(fmt);
            fmt = parser.compileFormat();
            parser.release();
            return function(v) {
                return fmt(v, me.getScope() || me.resolveListenerScope());
            };
        } else if (typeof fmt !== 'function') {
            Ext.raise('Invalid formatter');
        }
        return fmt;
    },
    updateTpl: function() {
        if (!this.isConfiguring) {
            this.refresh();
        }
    },
    updateRenderer: function() {
        if (!this.isConfiguring) {
            this.refresh();
        }
    },
    updateFormatter: function() {
        if (!this.isConfiguring) {
            this.refresh();
        }
    },
    formatValue: function(v) {
        var me = this,
            context = me.refreshContext,
            dataIndex = context.dataIndex,
            column = context.column,
            record = context.record,
            zeroValue = me.getZeroValue(),
            raw = v,
            summary = context.summary,
            args, data, format, renderer, scope, tpl;
        if (!context.summary && v === 0 && zeroValue !== null) {
            raw = zeroValue;
        } else if (!(tpl = me.getTpl(context))) {
            format = me.getFormatter();
            if (summary) {
                renderer = column.getSummaryRenderer();
                if (renderer) {
                    format = null;
                    scope = context.scope;
                    if (typeof renderer === 'string') {
                        raw = Ext.callback(renderer, scope, [
                            v,
                            context
                        ], 0, column);
                        me.friendly = false;
                    } else {
                        raw = renderer.call(scope || me, v, context);
                        if (renderer.length > 1) {
                            me.friendly = false;
                        }
                    }
                }
                format = column.getSummaryFormatter() || format;
            } else {
                renderer = me.getRenderer();
                if (renderer) {
                    args = [
                        v,
                        record,
                        dataIndex,
                        me,
                        column
                    ];
                    scope = me.getScope() || context.scope;
                    if (typeof renderer === 'function') {
                        raw = renderer.apply(scope || column, args);
                    } else {
                        raw = Ext.callback(renderer, scope, args, 0, me);
                    }
                }
            }
            if (format) {
                raw = format(raw);
            }
        } else {
            if (!(data = context.data)) {
                context.data = data = context.summary ? context.record.getData() : context.grid.gatherData(context.record);
            }
            raw = tpl.apply(data);
        }
        if (raw != null) {
            raw = String(raw);
        } else {
            raw = '';
        }
        return raw;
    },
    privates: {
        bound: function(fields) {
            var me = this,
                bound = !!fields[me.dataIndex],
                column, depends, i;
            if (!bound) {
                column = me.getColumn();
                depends = column && column.getDepends();
                if (depends) {
                    for (i = depends.length; !bound && i-- > 0; ) {
                        bound = !!fields[depends[i]];
                    }
                } else if (!me.friendly) {
                    bound = true;
                }
            }
            return bound;
        }
    }
});

Ext.define('Ext.grid.RowBody', {
    extend: Ext.Component,
    xtype: 'rowbody',
    config: {
        widget: null
    },
    classCls: Ext.baseCSSPrefix + 'rowbody',
    inheritUi: true,
    template: [
        {
            reference: 'spacerElement',
            cls: Ext.baseCSSPrefix + 'spacer-el'
        },
        {
            reference: 'contentElement',
            cls: Ext.baseCSSPrefix + 'content-el'
        }
    ],
    initialize: function() {
        var me = this,
            grid, rowExpander;
        me.callParent();
        grid = me.row.getGrid();
        if (grid && grid.hasRowExpander) {
            rowExpander = grid.findPlugin('rowexpander');
            if (rowExpander) {
                me.spacerElement.setWidth(rowExpander.getColumn().getWidth());
            }
        }
    },
    applyWidget: function(widget) {
        var row = this.row;
        if (widget) {
            widget = Ext.apply({
                ownerCmp: row
            }, widget);
            widget = Ext.widget(widget);
        }
        return widget;
    },
    updateWidget: function(widget, oldWidget) {
        if (oldWidget) {
            oldWidget.destroy();
        }
        if (widget) {
            this.contentElement.appendChild(widget.element);
        }
    },
    updateRecord: function(record, oldRecord) {
        var tpl = this.getTpl();
        if (tpl) {
            this.callParent([
                record,
                oldRecord
            ]);
        }
    },
    getInnerHtmlElement: function() {
        return this.contentElement;
    },
    doDestroy: function() {
        this.setWidget(null);
        this.callParent();
    }
});

Ext.define('Ext.grid.Row', {
    extend: Ext.Component,
    xtype: 'gridrow',
    mixins: [
        Ext.mixin.Queryable,
        Ext.dataview.GenericItem,
        Ext.dataview.Pinnable
    ],
    isGridRow: true,
    isRecordRefreshable: true,
    hasGridCells: true,
    cachedConfig: {
        collapsed: true
    },
    config: {
        body: null,
        expandedField: null,
        defaultCellUI: null,
        stickyVisibility: null
    },
    classCls: [
        Ext.baseCSSPrefix + 'listitem',
        Ext.baseCSSPrefix + 'gridrow'
    ],
    inheritUi: true,
    expandedCls: Ext.baseCSSPrefix + 'expanded',
    element: {
        reference: 'element',
        children: [
            {
                reference: 'cellsElement',
                className: Ext.baseCSSPrefix + 'cells-el'
            }
        ]
    },
    constructor: function(config) {
        this.cells = [];
        this.columnMap = {};
        this.callParent([
            config
        ]);
    },
    doDestroy: function() {
        var me = this;
        me.setRecord(null);
        me.setBody(null);
        me.cells = Ext.destroy(me.cells);
        me.callParent();
    },
    collapse: function() {
        this.setCollapsed(true);
    },
    expand: function() {
        this.setCollapsed(false);
    },
    toggleCollapsed: function() {
        this.setCollapsed(!this.getCollapsed());
    },
    updateCollapsed: function(collapsed) {
        var me = this,
            body = me.getBody(),
            grid = me.getParent(),
            record = me.getRecord(),
            expandField = me.getExpandedField(),
            expandedCls = me.expandedCls,
            expanderCell = me.expanderCell,
            recordsExpanded;
        if (record) {
            if (expandField) {
                record.set(expandField, !collapsed);
            } else {
                recordsExpanded = grid.$recordsExpanded || (grid.$recordsExpanded = {});
                if (collapsed) {
                    delete recordsExpanded[record.internalId];
                } else {
                    recordsExpanded[record.internalId] = true;
                }
            }
        }
        if (expanderCell) {
            expanderCell.setCollapsed(collapsed);
        }
        if (body) {
            if (collapsed) {
                body.hide();
                me.removeCls(expandedCls);
            } else {
                body.show();
                me.addCls(expandedCls);
            }
        }
    },
    applyBody: function(config, existing) {
        return Ext.updateWidget(existing, config, this, 'createBody');
    },
    createBody: function(body) {
        return Ext.merge({
            xtype: 'rowbody',
            ownerCmp: this,
            row: this,
            hidden: true
        }, body);
    },
    updateBody: function(body) {
        var me = this,
            grid = me.getParent();
        if (body) {
            me.bodyElement.appendChild(body.element);
            if (me.rendered && !body.rendered) {
                body.setRendered(true);
            }
        }
        if (grid) {
            grid.setVariableHeights(true);
            if (!grid.hasRowExpander) {
                me.expand();
            }
        }
    },
    onAdded: function(grid) {
        var me = this,
            cells = me.cells,
            cell, col, columns, i, k, n;
        me.callParent(arguments);
        if (grid) {
            columns = grid.getColumns();
            for (i = 0 , n = columns.length; i < n; i++) {
                cell = cells[i];
                col = columns[i];
                if (cell) {
                    if (cell.getColumn() === col) {
                        
                        continue;
                    }
                    for (k = cells.length; k-- > i; ) {
                        cell = cells[k];
                        me.removeColumn(cell.getColumn());
                    }
                }
                me.addColumn(columns[i]);
            }
        }
    },
    addColumn: function(column) {
        this.insertColumn(this.cells.length, column);
    },
    getCells: function(selector) {
        return selector ? Ext.ComponentQuery.query(selector, this.cells) : this.cells;
    },
    getRefItems: function(deep) {
        var result = [],
            body = this.getConfig('body', false, true),
            cells = this.cells,
            len = cells && cells.length,
            i, cell;
        for (i = 0; i < len; i++) {
            cell = cells[i];
            result.push(cell);
            if (deep && cell.getRefItems) {
                result.push.apply(result, cell.getRefItems());
            }
        }
        if (body) {
            result.push(body);
            if (deep && body.getRefItems) {
                result.push.apply(result, body.getRefItems());
            }
        }
        return result;
    },
    insertColumn: function(index, column) {
        var me = this,
            cells = me.cells,
            cell;
        if (column.isHeaderGroup) {
            return;
        }
        cell = me.createCell(column);
        if (index >= cells.length) {
            me.cellsElement.appendChild(cell.element);
            cells.push(cell);
        } else {
            cell.element.insertBefore(cells[index].element);
            cells.splice(index, 0, cell);
        }
        me.columnMap[column.getId()] = cell;
        if (cell.isExpanderCell) {
            me.expanderCell = cell;
        }
        if (me.rendered) {
            cell.setRendered(true);
        }
    },
    insertColumnBefore: function(column, ref) {
        var me = this,
            map = me.columnMap,
            id = column.getId(),
            cell = map[id],
            cells = me.cells,
            refCell, refIndex, index;
        if (ref) {
            refCell = me.getCellByColumn(ref);
            refIndex = cells.indexOf(refCell);
        } else {
            refIndex = cells.length - (cell ? 1 : 0);
        }
        if (cell) {
            index = cells.indexOf(cell);
            Ext.Array.move(cells, index, refIndex);
            if (refCell) {
                cell.element.insertBefore(refCell.element);
            } else {
                me.cellsElement.appendChild(cell.element);
            }
        } else {
            me.insertColumn(refIndex, column);
        }
    },
    removeColumn: function(column) {
        var me = this,
            columnMap = me.columnMap,
            columnId = column.getId(),
            cell = columnMap[columnId];
        if (cell) {
            Ext.Array.remove(me.cells, cell);
            delete columnMap[columnId];
            cell.destroy();
        }
    },
    updateRecord: function(record) {
        if (!this.destroyed && !this.destroying) {
            this.refresh();
        }
    },
    setColumnWidth: function(column) {
        var cell = this.getCellByColumn(column);
        if (cell) {
            cell.setWidth(column.getComputedWidth());
        }
    },
    showColumn: function(column) {
        this.setCellHidden(column, false);
    },
    hideColumn: function(column) {
        this.setCellHidden(column, true);
    },
    getCellByColumn: function(column) {
        return this.columnMap[column.getId()];
    },
    getColumnByCell: function(cell) {
        return cell.getColumn();
    },
    updateStickyVisibility: function(value) {
        this.fireEvent('stickyvisiblitychange', value);
    },
    refresh: function(context) {
        var me = this,
            cells = me.cells,
            body = me.getBody(),
            len = cells.length,
            expandField = me.getExpandedField(),
            grid = me.getParent(),
            sm = grid.getSelectable(),
            selection = sm.getSelection(),
            isCellSelection = selection.isCells || selection.isColumns,
            i, visibleIndex, cell, record, recordsExpanded;
        me.refreshContext = context = me.beginRefresh(context);
        record = context.record;
        me.syncDirty(record);
        for (i = 0 , visibleIndex = 0; i < len; ++i) {
            cell = cells[i];
            if (!context.summary || !cell.getColumn().getIgnore()) {
                if (cell.getRecord() === record) {
                    cell.refresh(context);
                } else {
                    cell.refreshContext = context;
                    cell.setRecord(record);
                    cell.refreshContext = null;
                }
                if (isCellSelection) {
                    cell.toggleCls(grid.selectedCls, sm.isCellSelected(me._recordIndex, visibleIndex));
                }
            }
            if (!cell.isHidden()) {
                visibleIndex++;
            }
        }
        context.cell = context.column = context.dataIndex = context.scope = null;
        if (body) {
            body.refreshContext = context;
            if (body.getRecord() === record) {
                body.updateRecord(record);
            } else {
                body.setRecord(record);
            }
            body.refreshContext = null;
            if (expandField) {
                me.setCollapsed(!record.get(expandField));
            } else {
                recordsExpanded = grid.$recordsExpanded || (grid.$recordsExpanded = {});
                if (grid.hasRowExpander) {
                    me.setCollapsed(!recordsExpanded[record.internalId]);
                }
            }
        }
        me.refreshContext = null;
    },
    privates: {
        refreshContext: null,
        beginRefresh: function(context) {
            var me = this,
                grid = me.getParent();
            context = context || {};
            context.from = context.from || 'row';
            context.grid = grid;
            context.record = me.getRecord();
            context.row = me;
            context.store = grid.store;
            return context;
        },
        createCell: function(column) {
            var cell = column.createCell(this);
            cell = Ext.create(cell);
            delete cell.$initParent;
            if (cell.inheritUi) {
                cell.doInheritUi();
            }
            cell.el.setTabIndex(-1);
            return cell;
        },
        setCellHidden: function(column, hidden) {
            var cell = this.getCellByColumn(column);
            if (cell) {
                cell.setHidden(hidden);
            }
        },
        getGrid: function() {
            return this.getParent();
        }
    }
});

Ext.define('Ext.grid.HeaderContainer', {
    extend: Ext.Container,
    xtype: 'headercontainer',
    isHeaderContainer: true,
    config: {
        columns: null,
        defaultColumnUI: null,
        sortable: true,
        verticalOverflow: null,
        reserveScrollbar: null,
        grid: null
    },
    docked: 'top',
    defaultType: 'column',
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    inheritUi: true,
    scrollable: {
        x: false,
        y: false
    },
    weighted: true,
    autoSize: null,
    constructor: function(config) {
        var me = this,
            isRoot = !me.isGridColumn;
        me.isRootHeader = isRoot;
        if (isRoot) {
            config.grid._headerContainer = me;
        }
        me.columns = [];
        me.callParent([
            config
        ]);
        if (isRoot) {
            config.grid._headerContainer = null;
        }
    },
    initialize: function() {
        var me = this;
        me.callParent();
        if (me.isRootHeader) {
            me.setInstanceCls(Ext.baseCSSPrefix + 'headercontainer');
            me.on({
                tap: 'onHeaderTap',
                triggertap: 'onHeaderTriggerTap',
                columnresize: 'onColumnResize',
                show: 'onColumnShow',
                hide: 'onColumnHide',
                sort: 'onColumnSort',
                scope: me,
                delegate: '[isLeafHeader]'
            });
            me.on({
                tap: 'onGroupTap',
                triggertap: 'onGroupTriggerTap',
                show: 'onGroupShow',
                hide: 'onGroupHide',
                add: 'onColumnAdd',
                move: 'onColumnMove',
                remove: 'onColumnRemove',
                scope: me,
                delegate: '[isHeaderGroup]'
            });
            me.on({
                add: 'onColumnAdd',
                move: 'onColumnMove',
                remove: 'onColumnRemove',
                scope: me
            });
        }
    },
    getRootHeaderCt: function() {
        var grid = this.getGrid();
        return grid && grid.getHeaderContainer();
    },
    getColumnForField: function(fieldName) {
        var columns = this.columns,
            n = columns.length,
            c, i;
        for (i = 0; i < n; ++i) {
            c = columns[i].getColumnForField(fieldName);
            if (c) {
                return c;
            }
        }
        return null;
    },
    getColumns: function(selector) {
        var result = this.columns;
        if (selector) {
            if (typeof selector === 'string') {
                result = Ext.ComponentQuery.query(selector, result);
            } else if (Ext.isFunction(selector)) {
                return result.filter(selector);
            }
        }
        return result;
    },
    getVisibleColumns: function() {
        var me = this,
            result = me.visibleColumns;
        if (!result) {
            result = me.visibleColumns = me.columns.filter(me.visibleLeafFilter);
        }
        return result;
    },
    getClosestVisibleHeader: function(index) {
        var result = typeof index === 'number' ? this.getVisibleColumns()[index] : index;
        if (result && result.hidden) {
            result = result.next(':visible') || result.prev(':visible');
        }
        return result;
    },
    indexOfLeaf: function(column) {
        return this.getVisibleColumns().indexOf(column);
    },
    factoryItem: function(item) {
        var grid = this.getGrid();
        if (item.isComponent) {
            if (item.isGridColumn) {
                item.setGrid(grid);
            }
        } else {
            item = Ext.apply({
                grid: grid
            }, item);
        }
        return this.callParent([
            item
        ]);
    },
    updateColumns: function(columns) {
        var me = this;
        if (me.isRootHeader) {
            me.columns = [];
            me.visibleColumns = null;
            me.add(columns);
        }
    },
    beginColumnUpdate: function() {
        var me = this;
        if (!me.isRootHeader) {
            return;
        }
        me.hasBulkUpdate = me.hasBulkUpdate || 0;
        me.hasBulkUpdate++;
        if (me.hasBulkUpdate === 1) {
            me.bulkAdd = [];
            me.updateMenuDisabledState = Ext.emptyFn;
        }
    },
    endColumnUpdate: function() {
        var me = this,
            length, i, columns, item;
        if (!me.isRootHeader || !me.hasBulkUpdate) {
            return;
        }
        me.hasBulkUpdate--;
        if (me.hasBulkUpdate === 0) {
            columns = me.bulkAdd;
            length = columns && columns.length;
            if (length) {
                me.visibleColumns = null;
                me.columns = me.getLeaves();
                for (i = 0; i < length; i++) {
                    item = columns[i];
                    item.columnIndex = me.columns.indexOf(item.column);
                }
                Ext.Array.sort(columns, me.sortByColumnIndex);
                for (i = 0; i < length; i++) {
                    item = columns[i];
                    me.fireEvent('columnadd', me, item.column, item.columnIndex);
                }
            }
            me.getGrid().refreshInnerWidth();
            me.bulkAdd = null;
            delete me.updateMenuDisabledState;
            me.updateMenuDisabledState();
            if (this.isRootHeader) {
                this.onColumnComputedWidthChange();
            }
        }
    },
    sortByColumnIndex: function(a, b) {
        return a.columnIndex - b.columnIndex;
    },
    add: function(items) {
        var ret,
            rootHeaders = this.getRootHeaderCt();
        if (rootHeaders) {
            rootHeaders.beginColumnUpdate();
        }
        ret = this.callParent([
            items
        ]);
        if (rootHeaders) {
            rootHeaders.endColumnUpdate();
        }
        return ret;
    },
    insert: function(index, item) {
        var ret,
            rootHeaders = this.getRootHeaderCt();
        if (rootHeaders) {
            rootHeaders.beginColumnUpdate();
        }
        ret = this.callParent([
            index,
            item
        ]);
        if (rootHeaders) {
            rootHeaders.endColumnUpdate();
        }
        return ret;
    },
    remove: function(which, destroy) {
        var ret,
            rootHeaders = this.getRootHeaderCt();
        if (rootHeaders) {
            rootHeaders.beginColumnUpdate();
        }
        ret = this.callParent([
            which,
            destroy
        ]);
        if (rootHeaders) {
            rootHeaders.endColumnUpdate();
        }
        return ret;
    },
    onColumnAdd: function(container, column) {
        var me = this,
            grid = me.getGrid(),
            groupColumns, ln, i, ui;
        if (column.isHeaderGroup) {
            groupColumns = column.getItems().items;
            for (i = 0 , ln = groupColumns.length; i < ln; i++) {
                me.onColumnAdd(column, groupColumns[i]);
            }
        } else {
            ui = column.getUi();
            if (ui == null) {
                column.setUi(me.getDefaultColumnUI());
            }
            column.setGrid(grid);
            me.bulkAdd.push({
                column: column
            });
        }
        me.updateMenuDisabledState();
    },
    onColumnMove: function(parent, column, toIdx, fromIdx) {
        var me = this,
            columns = me.columns,
            group = null,
            cols;
        me.visibleColumns = null;
        if (column.isHeaderGroup) {
            cols = column.getItems().items;
            group = column;
        } else {
            cols = [
                column
            ];
        }
        fromIdx = columns.indexOf(cols[0]);
        me.columns = me.getLeaves();
        me.fireEvent('columnmove', me, cols, group, fromIdx);
    },
    onColumnRemove: function(parent, column) {
        var me = this,
            columns, i, ln;
        me.visibleColumns = null;
        if (column.isHeaderGroup) {
            if (!column.destroying) {
                columns = column.getItems().items;
                ln = columns.length;
                for (i = 0; i < ln; i++) {
                    me.onColumnRemove(column, columns[i]);
                }
            }
        } else {
            Ext.Array.remove(me.columns, column);
            me.fireEvent('columnremove', me, column);
        }
        me.updateMenuDisabledState();
    },
    onHeaderTap: function(column, e) {
        var selModel = this.getGrid().getSelectable(),
            ret = this.fireEvent('columntap', this, column, e);
        if (ret !== false) {
            if (selModel.onHeaderTap) {
                selModel.onHeaderTap(this, column, e);
            }
        }
    },
    onGroupTriggerTap: function(column) {
        column.showMenu();
    },
    onHeaderTriggerTap: function(column) {
        column.showMenu();
    },
    onColumnShow: function(column) {
        var me = this;
        me.visibleColumns = null;
        me.fireEvent('columnshow', me, column);
        me.updateMenuDisabledState();
        if (this.isRootHeader) {
            this.onColumnComputedWidthChange();
        }
    },
    onColumnHide: function(column) {
        var me = this;
        me.visibleColumns = null;
        me.fireEvent('columnhide', me, column);
        me.updateMenuDisabledState();
        if (this.isRootHeader) {
            this.onColumnComputedWidthChange();
        }
    },
    onGroupShow: function(group) {
        var columns = group.getInnerItems(),
            ln = columns.length,
            i, column;
        this.visibleColumns = null;
        for (i = 0; i < ln; i++) {
            column = columns[i];
            if (!column.isHidden()) {
                this.fireEvent('columnshow', this, column);
            }
        }
        this.updateMenuDisabledState();
    },
    onGroupHide: function(group) {
        var columns = group.getInnerItems(),
            ln = columns.length,
            i, column;
        this.visibleColumns = null;
        for (i = 0; i < ln; i++) {
            column = columns[i];
            this.fireEvent('columnhide', this, column);
        }
        this.updateMenuDisabledState();
    },
    onGroupTap: function(column, e) {
        return this.fireEvent('headergrouptap', this, column, e);
    },
    onColumnResize: function(column, width, oldWidth) {
        this.fireEvent('columnresize', this, column, width, oldWidth);
    },
    onColumnSort: function(column, direction, newDirection) {
        if (direction !== null) {
            this.fireEvent('columnsort', this, column, direction, newDirection);
        }
    },
    scrollTo: function(x) {
        this.getScrollable().scrollTo(x);
    },
    updateGrid: function(grid) {
        if (this.isRootHeader) {
            this.parent = grid;
        }
    },
    doDestroy: function() {
        this.setGrid(null);
        this.callParent();
    },
    afterRender: function() {
        this.callParent();
        if (this.isRootHeader) {
            this.onColumnComputedWidthChange();
        }
    },
    privates: {
        columnsResizing: null,
        updateVerticalOverflow: function() {
            this.syncReserveSpace();
        },
        updateReserveScrollbar: function() {
            this.syncReserveSpace();
        },
        updateMenuDisabledState: function() {
            if (this.rendered) {
                var me = this.isRootHeader ? this : this.getRootHeaderCt(),
                    columns = [],
                    menuOfferingColumns = [],
                    len, i, column, columnIsHideable, checkItem;
                me.visitPreOrder('gridcolumn:not([hidden])', function(col) {
                    columns.push(col);
                    if (!col.isHidden(true) && !col.getMenuDisabled() && col.getConfig('menu', true)) {
                        menuOfferingColumns.push(col);
                    }
                });
                len = columns.length;
                for (i = 0; i < len; ++i) {
                    column = columns[i];
                    checkItem = column.getHideShowMenuItem(false);
                    if (checkItem) {
                        columnIsHideable = menuOfferingColumns.length > 1 || menuOfferingColumns[0] !== column;
                        checkItem['set' + (checkItem.getMenu() ? 'CheckChange' : '') + 'Disabled'](!columnIsHideable);
                    }
                }
            }
        },
        getLeaves: function() {
            return this.query('[isLeafHeader]');
        },
        onColumnComputedWidthChange: function(column, computedWidth) {
            var me = this,
                totalColumnWidth = 0,
                changedColumns = me.columnsResizing,
                columns, len, i, c, width;
            if (me.destroying) {
                return;
            }
            if (changedColumns) {
                changedColumns.push(column);
                return;
            }
            me.columnsResizing = changedColumns = [];
            columns = me.getColumns();
            len = columns.length;
            for (i = 0; i < len; i++) {
                c = columns[i];
                if (c === column) {
                    changedColumns.push(c);
                    width = computedWidth;
                } else {
                    width = c.isHidden(true) ? 0 : c.measureWidth();
                }
                totalColumnWidth += width;
            }
            totalColumnWidth = Math.floor(totalColumnWidth);
            me.getGrid().onColumnComputedWidthChange(changedColumns, totalColumnWidth);
            me.columnsResizing = null;
        },
        setRendered: function(rendered) {
            this.visibleColumns = null;
            this.callParent([
                rendered
            ]);
        },
        setSortState: function() {
            var grid = this.getGrid(),
                store = grid.getStore(),
                columns = grid.getColumns(),
                isGrouped = store.isGrouped(),
                len = columns && columns.length,
                sorters = store.getSorters(),
                grouper = store.getGrouper(),
                i, header, isGroupedHeader, sorter;
            for (i = 0; i < len; i++) {
                header = columns[i];
                sorter = header.sorter;
                isGroupedHeader = store.getGroupField() === header.getDataIndex();
                if (sorter) {
                    if (isGrouped && !isGroupedHeader) {
                        sorter = null;
                    } else if (isGrouped && isGroupedHeader) {
                        sorter = grouper;
                    } else if (!(sorters.contains(sorter) || grouper === sorter)) {
                        sorter = null;
                    }
                }
                header.setSortState(sorter);
            }
        },
        syncReserveSpace: function() {
            var reserve = this.getVerticalOverflow() || this.getReserveScrollbar(),
                scrollbarWidth = 0,
                grid, scroller;
            if (reserve) {
                grid = this.getGrid();
                if (grid) {
                    scroller = grid.getScrollable();
                    if (scroller) {
                        scrollbarWidth = scroller.getScrollbarSize().width + 'px';
                    }
                }
            }
            this.el.setStyle('padding-right', scrollbarWidth);
        },
        visibleLeafFilter: function(c) {
            return c.isLeafHeader && !c.isHidden();
        }
    }
});

Ext.define('Ext.menu.CheckItem', {
    extend: Ext.menu.Item,
    xtype: 'menucheckitem',
    isMenuCheckItem: true,
    hideOnClick: false,
    config: {
        checked: false,
        checkHandler: null,
        checkChangeDisabled: false,
        value: null,
        showCheckbox: null
    },
    classCls: Ext.baseCSSPrefix + 'menucheckitem',
    checkedCls: Ext.baseCSSPrefix + 'checked',
    checkboxIconElCls: Ext.baseCSSPrefix + 'checkbox-icon-el',
    ariaRole: 'menuitemcheckbox',
    defaultBindProperty: 'checked',
    submenuText: '{0} submenu',
    href: null,
    target: null,
    element: {
        reference: 'element',
        tabindex: Ext.is.iOS ? -1 : null,
        cls: Ext.baseCSSPrefix + 'unselectable ' + Ext.baseCSSPrefix + 'has-left-icon'
    },
    focusEl: 'checkboxElement',
    ariaEl: 'checkboxElement',
    getTemplate: function() {
        var template = this.callParent(),
            body = template[0];
        body.tag = 'div';
        body.href = null;
        body.children.push({
            tag: 'input',
            type: 'checkbox',
            reference: 'checkboxElement',
            cls: Ext.baseCSSPrefix + 'checkbox-el'
        });
        return template;
    },
    initialize: function() {
        var me = this;
        me.callParent();
        me.element.on({
            mousedown: 'onCheckboxMousedown',
            translate: false,
            scope: me
        });
        me.checkboxElement.on({
            change: 'onCheckboxChange',
            delegated: false,
            scope: me
        });
        this.syncCheckboxCls();
    },
    enableFocusable: function() {
        this.mixins.focusable.enableFocusable();
        this.checkboxElement.dom.readOnly = '';
    },
    disableFocusable: function() {
        this.mixins.focusable.disableFocusable();
        this.checkboxElement.dom.readOnly = 'readonly';
    },
    setChecked: function(checked, suppressEvents) {
        var me = this,
            isConfiguring = me.isConfiguring;
        if (suppressEvents) {
            me.isConfiguring = true;
        }
        me.callParent([
            checked
        ]);
        if (suppressEvents) {
            me.isConfiguring = isConfiguring;
        }
    },
    updateChecked: function(checked) {
        this.checkboxElement.dom.checked = checked;
        this.onCheckChange();
    },
    updateCheckChangeDisabled: function(checkChangeDisabled) {
        this.checkboxElement.dom.readOnly = checkChangeDisabled;
    },
    updateValue: function(value) {
        this.checkboxElement.dom.value = value;
    },
    updateText: function(text) {
        var me = this,
            ariaDom = me.ariaEl.dom;
        me.callParent([
            text
        ]);
        if (me.getValue() === null) {
            me.setValue(text);
        }
        if (ariaDom && me.getMenu()) {
            ariaDom.setAttribute('aria-label', Ext.String.formatEncode(me.submenuText, text));
        }
    },
    applyShowCheckbox: function(showCheckbox) {
        return !!showCheckbox;
    },
    updateShowCheckbox: function(showCheckbox) {
        this.checkboxElement.setDisplayed(showCheckbox);
    },
    updateIcon: function(icon, oldIcon) {
        this.callParent([
            icon,
            oldIcon
        ]);
        if (!this.isConfiguring) {
            this.syncCheckboxCls();
        }
    },
    updateIconCls: function(iconCls, oldIconCls) {
        this.callParent([
            iconCls,
            oldIconCls
        ]);
        if (!this.isConfiguring) {
            this.syncCheckboxCls();
        }
    },
    updateIconAlign: function(iconAlign, oldIconAlign) {
        this.callParent([
            iconAlign,
            oldIconAlign
        ]);
        if (!this.isConfiguring) {
            this.syncCheckboxCls();
        }
    },
    privates: {
        onSpace: function(e) {
            if (this.getDisabled()) {
                e.preventDefault();
            }
        },
        onClick: function(e) {
            var me = this,
                arrowElement = me.arrowElement,
                result, parentResult, region;
            if (me.getDisabled()) {
                e.preventDefault();
            }
            if (e.pointerType !== 'mouse') {
                region = me.bodyElement.getRegion();
                if (me.getMenu()) {
                    region.setWidth(region.getWidth() - arrowElement.getWidth() - arrowElement.getMargin('lr'));
                }
                if (region.contains(e.getPoint())) {
                    result = false;
                } else {
                    e.preventDefault();
                }
            }
            parentResult = me.callParent([
                e
            ]);
            return (result === false) ? result : parentResult;
        },
        onCheckboxMousedown: function(e) {
            if ((Ext.isApple && !Ext.isChrome) || !this.checkboxElement.contains(e.target)) {
                e.preventDefault();
            }
        },
        onCheckboxChange: function() {
            var me = this,
                checkboxElement = me.checkboxElement.dom,
                meChecked = me.getChecked(),
                isChecked = checkboxElement.checked;
            if (me.getCheckChangeDisabled()) {
                checkboxElement.checked = meChecked;
                return false;
            }
            if (isChecked === meChecked || me.getDisabled()) {
                return;
            }
            if (me.fireEvent('beforecheckchange', me, isChecked) === false) {
                checkboxElement.checked = !isChecked;
            } else {
                me.setChecked(isChecked);
            }
        },
        onCheckChange: function() {
            var me = this,
                checked = me.checkboxElement.dom.checked,
                el = me.el,
                ariaDom = me.ariaEl.dom;
            el.toggleCls(me.checkedCls, !!checked);
            if (ariaDom) {
                ariaDom.setAttribute('aria-checked', me.getMenu() ? 'mixed' : checked);
            }
            me.publishState('checked', checked);
            if (!me.isConfiguring) {
                Ext.callback(me.getCheckHandler(), me.scope, [
                    me,
                    checked
                ], 0, me);
                me.fireEvent('checkchange', me, checked);
            }
        },
        syncHasIconCls: function() {
            var me = this;
            me.toggleCls(me.hasRightIconCls, me.hasIcon());
        },
        syncCheckboxCls: function() {
            var me = this,
                leftIconElement = me.leftIconElement,
                rightIconElement = me.rightIconElement,
                checkboxIconElCls = me.checkboxIconElCls,
                checkboxIconElement, oldCheckboxIconElement;
            if (me.hasIcon() && (me.getIconAlign() === 'left')) {
                checkboxIconElement = rightIconElement;
                oldCheckboxIconElement = leftIconElement;
            } else {
                checkboxIconElement = leftIconElement;
                oldCheckboxIconElement = rightIconElement;
            }
            checkboxIconElement.addCls(checkboxIconElCls);
            oldCheckboxIconElement.removeCls(checkboxIconElCls);
        }
    }
});

Ext.define('Ext.grid.column.Column', {
    extend: Ext.grid.HeaderContainer,
    alternateClassName: 'Ext.grid.column.Template',
    xtype: [
        'gridcolumn',
        'column',
        'templatecolumn'
    ],
    isGridColumn: true,
    mixins: [
        Ext.mixin.StyleCacher,
        Ext.mixin.Toolable
    ],
    config: {
        align: undefined,
        cell: {
            xtype: 'gridcell'
        },
        dataIndex: null,
        locked: null,
        defaultWidth: 100,
        depends: null,
        emptyText: {
            cached: true,
            $value: '\xa0'
        },
        text: '\xa0',
        sortable: true,
        groupable: true,
        resizable: true,
        hideable: true,
        renderer: null,
        formatter: null,
        scope: null,
        editable: null,
        editor: null,
        defaultEditor: {
            lazy: true,
            $value: {}
        },
        editorDefaults: {
            cached: true,
            $value: {
                "default": {
                    xtype: 'textfield',
                    autoComplete: false,
                    textAlign: undefined
                },
                'bool,boolean': {
                    xtype: 'checkboxfield',
                    bodyAign: undefined
                },
                date: {
                    xtype: 'datefield',
                    textAlign: undefined
                },
                'float,number': {
                    xtype: 'numberfield',
                    textAlign: undefined
                },
                'int,integer': {
                    xtype: 'numberfield',
                    decimals: 0,
                    textAlign: undefined
                }
            }
        },
        ignore: false,
        ignoreExport: false,
        exportStyle: null,
        exportRenderer: false,
        summary: null,
        summaryCell: null,
        summaryDataIndex: null,
        summaryFormatter: null,
        summaryRenderer: null,
        summaryType: null,
        exportSummaryRenderer: false,
        minWidth: 40,
        tpl: null,
        computedWidth: null,
        grouper: {
            lazy: true,
            $value: null
        },
        groupHeaderTpl: null,
        sorter: {
            lazy: true,
            $value: true
        },
        scratchCell: {
            lazy: true,
            $value: true
        },
        menu: {
            lazy: true,
            $value: {}
        },
        menuDisabled: null,
        hideShowMenuItem: {
            lazy: true,
            $value: {
                xtype: 'menucheckitem'
            }
        }
    },
    updateLocked: function(v) {
        var me = this,
            grid = me.getGrid(),
            region = grid && grid.region,
            lockedGrid, key, targetRegion;
        if (region) {
            lockedGrid = region.lockedGrid;
            key = lockedGrid.getRegionKey(v);
            targetRegion = lockedGrid.getRegion(key);
            if (targetRegion && targetRegion !== region) {
                lockedGrid.handleChangeRegion(targetRegion, me);
            }
        }
        return v;
    },
    toolDefaults: {
        ui: 'gridcolumn',
        zone: 'tail'
    },
    toolAnchorName: 'titleWrapElement',
    dockTools: false,
    scrollable: false,
    docked: null,
    sortState: null,
    ariaSortStates: {
        ASC: 'ascending',
        DESC: 'descending'
    },
    inheritUi: true,
    classCls: Ext.baseCSSPrefix + 'gridcolumn',
    sortedCls: Ext.baseCSSPrefix + 'sorted',
    secondarySortCls: Ext.baseCSSPrefix + 'secondary-sort',
    auxSortCls: Ext.baseCSSPrefix + 'aux-sort',
    resizableCls: Ext.baseCSSPrefix + 'resizable',
    groupCls: Ext.baseCSSPrefix + 'group',
    leafCls: Ext.baseCSSPrefix + 'leaf',
    menuOpenCls: Ext.baseCSSPrefix + 'menu-open',
    alignCls: {
        left: Ext.baseCSSPrefix + 'align-left',
        center: Ext.baseCSSPrefix + 'align-center',
        right: Ext.baseCSSPrefix + 'align-right'
    },
    constructor: function(config) {
        var me = this,
            isHeaderGroup, menu;
        if (config.columns || me.columns) {
            isHeaderGroup = me.isHeaderGroup = true;
        } else {
            me.isLeafHeader = true;
        }
        me.callParent([
            config
        ]);
        me.addCls(isHeaderGroup ? me.groupCls : me.leafCls);
        menu = me.getConfig('menu', true);
        if (!menu && me.getMenuDisabled() === null) {
            me.setMenuDisabled(true);
        }
    },
    getTemplate: function() {
        var me = this,
            beforeTitleTemplate = me.beforeTitleTemplate,
            afterTitleTemplate = me.afterTitleTemplate,
            titleTpl = [];
        if (beforeTitleTemplate) {
            titleTpl.push.apply(titleTpl, beforeTitleTemplate);
        }
        titleTpl.push({
            reference: 'titleElement',
            className: Ext.baseCSSPrefix + 'title-el',
            children: [
                {
                    reference: 'textElement',
                    className: Ext.baseCSSPrefix + 'text-el',
                    "data-qoverflow": true
                },
                {
                    reference: 'sortIconElement',
                    cls: Ext.baseCSSPrefix + 'sort-icon-el ' + Ext.baseCSSPrefix + 'font-icon'
                }
            ]
        });
        if (afterTitleTemplate) {
            titleTpl.push.apply(titleTpl, afterTitleTemplate);
        }
        return [
            {
                reference: 'headerElement',
                cls: Ext.baseCSSPrefix + 'header-el',
                children: [
                    {
                        reference: 'titleWrapElement',
                        cls: Ext.baseCSSPrefix + 'title-wrap-el',
                        uiCls: 'title-wrap-el',
                        children: titleTpl
                    },
                    {
                        reference: 'resizerElement',
                        cls: Ext.baseCSSPrefix + 'resizer-el ' + Ext.baseCSSPrefix + 'item-no-tap'
                    },
                    {
                        reference: 'triggerElement',
                        cls: Ext.baseCSSPrefix + 'trigger-el ' + Ext.baseCSSPrefix + 'font-icon ' + Ext.baseCSSPrefix + 'item-no-tap'
                    }
                ]
            },
            {
                reference: 'bodyElement',
                cls: Ext.baseCSSPrefix + 'body-el',
                uiCls: 'body-el'
            }
        ];
    },
    initialize: function() {
        var me = this;
        if (me.isLeafHeader && !me.getWidth() && me.getFlex() == null) {
            me.setWidth(me.getDefaultWidth());
        }
        me.callParent();
        me.element.on({
            tap: 'onColumnTap',
            longpress: 'onColumnLongPress',
            scope: this
        });
        me.triggerElement.on({
            tap: 'onTriggerTap',
            scope: this
        });
        me.resizerElement.on({
            tap: 'onResizerTap',
            doubletap: 'onResizerDoubleTap',
            scope: this
        });
        if (me.isHeaderGroup) {
            me.on({
                add: 'doVisibilityCheck',
                remove: 'doVisibilityCheck',
                show: 'onColumnShow',
                hide: 'onColumnHide',
                move: 'onColumnMove',
                delegate: '> column',
                scope: me
            });
            me.on({
                show: 'onShow',
                scope: me
            });
        }
    },
    doDestroy: function() {
        var me = this;
        me.destroyMembers('editor', 'resizeListener', 'menu', 'hideShowMenuItem', 'childColumnsMenu');
        me.setScratchCell(null);
        me.mixins.toolable.doDestroy.call(me);
        me.callParent();
    },
    onAdded: function(parent, instanced) {
        this.visibleIndex = null;
        this.callParent([
            parent,
            instanced
        ]);
    },
    ensureEditor: function() {
        var me = this,
            editable = me.getEditable(),
            editor = editable !== false && me.getEditor(),
            cfg;
        if (!editor && editable) {
            cfg = me.getDefaultEditor();
            editor = Ext.create(cfg);
            me.setEditor(editor);
        }
        return editor;
    },
    getVisibleIndex: function() {
        var visibleIndex = this.visibleIndex,
            rootHeaders;
        if (visibleIndex == null) {
            if (this.isHeaderGroup) {
                visibleIndex = false;
            } else {
                rootHeaders = this.getRootHeaderCt();
                if (rootHeaders) {
                    visibleIndex = rootHeaders.indexOfLeaf(this);
                }
            }
            this.visibleIndex = visibleIndex;
        }
        return visibleIndex;
    },
    _columnScopeRe: /^column\./,
    _gridScopeRe: /^grid\./,
    applyMenu: function(menu) {
        var me = this,
            grid = me.getGrid(),
            columnScopeRe = me._columnScopeRe,
            gridScopeRe = me._gridScopeRe,
            extraItems, gridColumnMenu, i, item, items, s;
        Ext.destroy(me.sortChangeListener);
        if (menu && !menu.isMenu) {
            if (Ext.isArray(menu)) {
                extraItems = menu;
                menu = null;
            } else if (!menu.items) {
                menu = {
                    items: menu
                };
            }
            if (!(gridColumnMenu = grid.getColumnMenu())) {
                menu = menu ? Ext.clone(menu) : {};
            } else {
                gridColumnMenu = Ext.clone(gridColumnMenu);
                menu = menu ? Ext.merge(gridColumnMenu, menu) : gridColumnMenu;
            }
            menu.ownerCmp = me;
            menu = Ext.create(menu);
            me.sortChangeListener = menu.on({
                groupchange: 'onColumnMenuGroupChange',
                scope: me
            });
            items = menu.getItems().items;
            for (i = items && items.length; i-- > 0; ) {
                item = items[i];
                if (columnScopeRe.test(s = item.getHandler() || '')) {
                    item.setHandler(s.substr(7));
                    item.scope = me;
                } else if (gridScopeRe.test(s)) {
                    item.setHandler(s.substr(5));
                    item.scope = grid;
                } else if (item.isMenuCheckItem) {
                    if (columnScopeRe.test(s = item.getCheckHandler() || '')) {
                        item.setCheckHandler(s.substr(7));
                        item.scope = me;
                    } else if (gridScopeRe.test(s)) {
                        item.setCheckHandler(s.substr(5));
                        item.scope = grid;
                    }
                }
            }
            if (extraItems) {
                menu.add(extraItems);
            }
            grid.fireEvent('columnmenucreated', grid, me, menu);
        }
        return menu;
    },
    updateMenu: function(menu, oldMenu) {
        if (oldMenu) {
            oldMenu.destroy();
        }
    },
    beforeShowMenu: function(menu) {
        var me = this,
            store = me.getGrid().getStore(),
            isGrouped = store && !!store.getGrouper(),
            groupByThis = menu.getComponent('groupByThis'),
            showInGroups = menu.getComponent('showInGroups'),
            sortAsc = menu.getComponent('sortAsc'),
            sortDesc = menu.getComponent('sortDesc');
        sortAsc.setDisabled(!store);
        sortDesc.setDisabled(!store);
        if (!store) {
            groupByThis.setHidden(true);
            showInGroups.setHidden(true);
            return;
        }
        menu.suspendEvent('groupchange');
        if (sortAsc) {
            me.syncMenuItemState(sortAsc);
        }
        if (sortDesc) {
            me.syncMenuItemState(sortDesc);
        }
        if (groupByThis) {
            groupByThis.setHidden(!(me.canGroup() && !store.isTreeStore));
        }
        menu.resumeEvent('groupchange');
        if (showInGroups) {
            showInGroups.setHidden(store.isTreeStore);
            showInGroups.setChecked(isGrouped);
            showInGroups.setDisabled(!isGrouped);
        }
    },
    showMenu: function() {
        var me = this,
            menu = !me.getMenuDisabled() && me.getMenu(),
            menuOpenCls = me.menuOpenCls,
            grid;
        if (menu) {
            grid = me.getGrid();
            if (me.beforeShowMenu(menu) !== false && grid.beforeShowColumnMenu(me, menu) !== false) {
                menu.showBy(me.triggerElement);
                me.addCls(menuOpenCls);
                menu.on({
                    single: true,
                    hide: function() {
                        if (!(me.destroyed || me.destroying)) {
                            me.removeCls(menuOpenCls);
                        }
                        if (!(grid.destroyed || grid.destroying)) {
                            grid.onColumnMenuHide(me, menu);
                        }
                    }
                });
            }
        }
    },
    getCells: function() {
        var cells = [],
            rows = this.getGrid().items.items,
            len = rows.length,
            i, row;
        for (i = 0; i < len; ++i) {
            row = rows[i];
            if (row.isGridRow) {
                cells.push(row.getCellByColumn(this));
            }
        }
        return cells;
    },
    getColumnForField: function(fieldName) {
        if (fieldName === this.getDataIndex()) {
            return this;
        }
        return this.callParent([
            fieldName
        ]);
    },
    isHideable: function() {
        var menuOfferingColumns = [];
        this.getRootHeaderCt().visitPreOrder('gridcolumn:not([hidden])', function(col) {
            if (!col.getMenuDisabled() && col.getConfig('menu', true)) {
                menuOfferingColumns.push(col);
            }
        });
        return menuOfferingColumns.length > 1 || menuOfferingColumns[0] !== this;
    },
    applyTpl: function(tpl) {
        return Ext.XTemplate.get(tpl);
    },
    applyAlign: function(align, oldAlign) {
        if (align == null) {
            align = this.isHeaderGroup ? 'center' : 'left';
        }
        return align;
    },
    updateAlign: function(align, oldAlign) {
        var me = this,
            alignCls = me.alignCls;
        if (oldAlign) {
            me.removeCls(alignCls[oldAlign]);
        }
        if (align) {
            if (!alignCls[align]) {
                Ext.raise("Invalid value for align: '" + align + "'");
            }
            me.addCls(alignCls[align]);
        }
        me.syncToolableAlign();
    },
    updateMenuDisabled: function(menuDisabled) {
        if (this.triggerElement) {
            this.triggerElement.setVisible(!menuDisabled);
        }
    },
    onColumnTap: function(e) {
        var me = this,
            grid = me.getGrid(),
            selModel = grid.getSelectable(),
            store = grid.getStore(),
            sorters = store && store.getSorters(true),
            sorter = store && me.pickSorter(),
            sorterIndex = sorter ? sorters.indexOf(sorter) : -1,
            isSorted = sorter && (sorterIndex !== -1 || sorter === store.getGrouper());
        if (Ext.Component.from(e) !== me || e.getTarget('.' + Ext.baseCSSPrefix + 'item-no-tap', me)) {
            return;
        }
        if (store && me.isSortable() && (!selModel || !selModel.getColumns())) {
            if (sorter.isGrouper) {
                sorter.toggle();
                store.group(sorter);
            }
            else if (sorterIndex === 0) {
                me.toggleSortState();
            } else {
                if (isSorted) {
                    store.sort(sorter, 'prepend');
                } else {
                    me.sort('ASC');
                }
            }
        }
        return me.fireEvent('tap', me, e);
    },
    onTriggerTap: function(e) {
        this.fireEvent('triggertap', this, e);
    },
    onResizerTap: function(e) {
        if (e.getPoint().isContainedBy(this.triggerElement.getRegion())) {
            this.fireEvent('triggertap', this, e);
        }
    },
    onResizerDoubleTap: function(e) {
        e.claimGesture();
        Ext.asap(this.autoSize, this);
    },
    onColumnLongPress: function(e) {
        this.fireEvent('longpress', this, e);
    },
    onGroupByThis: function() {
        var me = this,
            grid = me.getGrid(),
            grouper = me.getGrouper(),
            store = grid.getStore(),
            dataIndex;
        if (!grouper) {
            dataIndex = me.getDataIndex();
            if (dataIndex != null) {
                me.setGrouper({
                    property: dataIndex
                });
                grouper = me.getGrouper();
            }
        }
        if (grouper) {
            store.setGrouper(grouper);
        }
    },
    onColumnMenuGroupChange: function(menu, groupName, value) {
        if (groupName === 'sortDir') {
            this.setSortDirection(value);
        }
    },
    getSortDirection: function() {
        var sorter = this.pickSorter();
        return sorter && sorter.getDirection();
    },
    setSortDirection: function(direction) {
        var me = this,
            grid = me.getGrid(),
            store = grid.getStore(),
            sorter = me.pickSorter(),
            sorters = store.getSorters(true),
            isSorted = sorter && (sorters.contains(sorter) || sorter.isGrouper);
        if (direction) {
            if (isSorted) {
                if (sorter.getDirection() !== direction) {
                    sorter.setDirection(direction);
                    if (sorter.isGrouper) {
                        store.group(sorter);
                    } else {
                        sorters.beginUpdate();
                        sorters.endUpdate();
                    }
                }
            } else {
                return me.sort(direction);
            }
        }
        else if (sorter) {
            sorters.remove(sorter);
        }
        if (!store.getRemoteSort()) {
            me.getRootHeaderCt().setSortState();
        }
    },
    syncMenuItemState: function(menuItem) {
        if (menuItem) {
            var me = this,
                sortable = me.isSortable(),
                store = me.getGrid().getStore(),
                sorter = me.pickSorter(),
                isSorted = sorter && (store.getSorters().contains(sorter) || sorter.isGrouper);
            menuItem.setDisabled(!sortable);
            menuItem.setChecked(sortable && isSorted && sorter.getDirection() === menuItem.getValue());
        }
    },
    onToggleShowInGroups: function() {
        var grid = this.getGrid(),
            store = grid.getStore();
        store.setGrouper(null);
    },
    updateResizable: function() {
        var me = this,
            widthed = me.getWidth() != null,
            flexed = me.getFlex() != null;
        me.toggleCls(me.resizableCls, !!(me.getResizable() && (widthed || flexed || me.isLeafHeader)));
    },
    updateText: function(text) {
        this.setHtml(text || '\xa0');
    },
    onResize: function() {
        if (!this.isHidden(true)) {
            this.updateResizable(this.getResizable());
            this.measureWidth();
            this.syncRowHeight();
        }
    },
    syncRowHeight: function() {
        var grids = this.getGrid().allPartners || [
                this.getGrid()
            ],
            i,
            len = grids.length,
            grid;
        for (i = 0; i < len; ++i) {
            grid = grids[i];
            grid.syncRowsToHeight(true);
        }
    },
    getComputedWidth: function() {
        return this.isVisible(true) ? this._computedWidth : 0;
    },
    updateColumns: function(columns) {
        this.getItems();
        this.add(columns);
    },
    measureWidth: function() {
        var width = this.el.measure('w');
        this.setComputedWidth(width);
        return width;
    },
    updateComputedWidth: function(value, oldValue) {
        var me = this,
            rootHeaderCt = !me.isConfiguring && me.getRootHeaderCt();
        if (rootHeaderCt) {
            rootHeaderCt.onColumnComputedWidthChange(me, value);
            me.fireEvent('columnresize', me, value, oldValue);
        }
    },
    updateDataIndex: function(dataIndex) {
        var sorter;
        if (!this.isConfiguring) {
            sorter = this.pickSorter();
            if (sorter) {
                this.setSorter(null);
            }
        }
    },
    applyGroupHeaderTpl: function(tpl) {
        return Ext.XTemplate.get(tpl);
    },
    updateGroupHeaderTpl: function(tpl) {
        var grouper = this.grouper;
        if (grouper) {
            grouper.headerTpl = tpl;
        }
    },
    isSortable: function() {
        var me = this;
        return me.isLeafHeader && me.getSortable() && (me.pickSorter() || me.getDataIndex()) && me.getRootHeaderCt().getSortable() && me.getGrid().sortableColumns !== false;
    },
    applyEditor: function(value) {
        if (value && !value.isInstance) {
            if (typeof (value) === 'string') {
                value = {
                    xtype: value
                };
            }
            if (!value.xtype) {
                value = Ext.apply({
                    xtype: value.field ? 'celleditor' : 'textfield'
                }, value);
            }
            return Ext.create(value);
        }
        return value;
    },
    applyEditorDefaults: function(defaults) {
        var ret = {},
            i, key, keys;
        if (defaults) {
            for (key in defaults) {
                keys = key.split(',');
                for (i = 0; i < keys.length; ++i) {
                    ret[keys[i]] = defaults[key];
                }
            }
        }
        return ret;
    },
    applyDefaultEditor: function(editor) {
        var me = this,
            dataIndex = me.getDataIndex(),
            bodyAlign = 'bodyAlign',
            textAlign = 'textAlign',
            defaults, model, field, undef;
        if (dataIndex) {
            model = me.getGrid().store.getModel();
            field = model.getField(dataIndex);
            if (!editor.isInstance) {
                editor = Ext.clone(editor);
                if (!editor.xtype) {
                    defaults = me.getEditorDefaults();
                    defaults = Ext.clone((field && defaults[field.type]) || defaults.default);
                    if (textAlign in defaults && defaults[textAlign] === undef) {
                        defaults[textAlign] = me.getAlign();
                    } else if (bodyAlign in defaults && defaults[bodyAlign] === undef) {
                        defaults[bodyAlign] = me.getAlign();
                    }
                    Ext.applyIf(editor, defaults);
                }
            }
            editor._validationField = field;
        }
        return editor;
    },
    updateEditor: function(editor, oldEditor) {
        if (oldEditor && (!editor || (editor.isCellEditor && editor.getField() !== oldEditor))) {
            oldEditor.destroy();
        }
        if (editor) {
            editor.$column = this;
        }
    },
    applyFormatter: function(format) {
        var me = this,
            fmt = format,
            parser;
        if (fmt) {
            parser = Ext.app.bind.Parser.fly(fmt);
            fmt = parser.compileFormat();
            parser.release();
            return function(v) {
                return fmt(v, me.getScope() || me.resolveListenerScope());
            };
        }
        return fmt;
    },
    applySummaryFormatter: function(format) {
        var me = this,
            fmt = format,
            parser;
        if (fmt) {
            parser = Ext.app.bind.Parser.fly(fmt);
            fmt = parser.compileFormat();
            parser.release();
            return function(v) {
                return fmt(v, me.getScope() || me.resolveListenerScope());
            };
        }
        return fmt;
    },
    applyGrouper: function(grouper) {
        var me = this,
            cfg = grouper;
        if (cfg && !cfg.isInstance) {
            if (typeof cfg === 'string') {
                cfg = {
                    groupFn: cfg
                };
            } else {
                cfg = Ext.apply({}, cfg);
            }
            if (typeof cfg.groupFn === 'string') {
                cfg = me.scopeReplacer(cfg, grouper, 'groupFn', 'setGroupFn');
            }
            if (typeof cfg.sorterFn === 'string') {
                cfg = me.scopeReplacer(cfg, grouper, 'sorterFn', 'setSorterFn');
            }
            grouper = new Ext.util.Grouper(cfg);
        }
        if (grouper) {
            grouper.owner = me.getGrid();
            grouper.headerTpl = me.getGroupHeaderTpl();
        }
        return grouper;
    },
    updateGrouper: function(grouper, oldGrouper) {
        var store = this.getGrid().getStore();
        if (store && oldGrouper) {
            if (oldGrouper === store.getGrouper()) {
                store.setGrouper(grouper);
            }
        }
        this.grouper = grouper;
    },
    applySorter: function(sorter) {
        var me = this,
            cfg = sorter,
            sortProperty;
        if (cfg && !cfg.isInstance) {
            if (cfg === true) {
                sortProperty = me.getSortParam();
                if (!sortProperty) {
                    return null;
                }
                cfg = {
                    property: sortProperty,
                    direction: 'ASC'
                };
            } else {
                if (typeof cfg === 'string') {
                    cfg = {
                        sorterFn: cfg
                    };
                }
                if (typeof cfg.sorterFn === 'string') {
                    cfg = me.scopeReplacer(cfg, sorter, 'sorterFn', 'setSorterFn');
                }
            }
            sorter = new Ext.util.Sorter(cfg);
        }
        if (sorter) {
            sorter.owner = me.getGrid();
        }
        return sorter;
    },
    updateSorter: function(sorter, oldSorter) {
        var store = this.getGrid().getStore(),
            sorters = store ? store.getSorters() : null,
            at;
        if (sorters) {
            if (oldSorter && (at = sorters.indexOf(oldSorter)) > -1) {
                if (sorter) {
                    sorters.splice(at, 1, sorter);
                } else {
                    sorters.remove(oldSorter);
                }
            }
        }
        this.sorter = sorter;
    },
    pickSorter: function() {
        var me = this,
            store = me.getGrid().getStore(),
            result;
        if (store.isGrouped() && store.getGroupField() === me.getDataIndex()) {
            result = me.getGrouper() || store.getGrouper();
            me.sortState = result.getDirection();
        } else {
            result = me.getSorter();
        }
        return result;
    },
    applyHideShowMenuItem: function(config, existing) {
        return Ext.updateWidget(existing, config, this, 'createHideShowMenuItem');
    },
    createHideShowMenuItem: function(defaults) {
        return Ext.apply({
            text: this.getText(),
            checked: !this.getHidden(),
            column: this
        }, defaults);
    },
    getHideShowMenuItem: function(deep) {
        var me = this,
            result = me.callParent(),
            items = me.items.items,
            len = items.length,
            childItems = [],
            childColumnsMenu = me.childColumnsMenu,
            i;
        if (me.isHeaderGroup && deep !== false) {
            if (!childColumnsMenu) {
                result.setMenu({});
                me.childColumnsMenu = childColumnsMenu = result.getMenu();
            }
            if (!childColumnsMenu.items.length || me.rebuildChildColumnsMenu) {
                for (i = 0; i < len; i++) {
                    if (items[i].getHideable()) {
                        childItems.push(items[i].getHideShowMenuItem());
                    }
                }
                childColumnsMenu.removeAll(false);
                childColumnsMenu.add(childItems);
            }
        }
        result['set' + (result.getMenu() ? 'CheckChange' : '') + 'Disabled'](!me.isHideable());
        return result;
    },
    getInnerHtmlElement: function() {
        return this.textElement;
    },
    getSortParam: function() {
        return this.getDataIndex();
    },
    applyCell: function(cell, oldCell) {
        if (oldCell) {
            cell = Ext.apply(oldCell, cell);
        }
        return cell;
    },
    createCell: function(row) {
        var me = this,
            cfg = {
                row: row,
                ownerCmp: row || me,
                column: me,
                width: me.rendered ? (me.getComputedWidth() || me.measureWidth()) : me.getWidth(),
                minWidth: me.getMinWidth()
            },
            align = me.getAlign(),
            cellCfg;
        if (row && row.isSummaryRow) {
            cellCfg = me.getSummaryCell();
            if (!cellCfg) {
                cellCfg = me.getCell();
                if (cellCfg.xtype === 'widgetcell') {
                    cellCfg = Ext.apply({}, cellCfg);
                    cellCfg.xtype = 'gridcell';
                    delete cellCfg.widget;
                }
            }
        } else {
            cellCfg = me.getCell();
        }
        if (align) {
            cfg.align = align;
        }
        if (row) {
            cfg.hidden = me.isHidden(row.getGrid().getHeaderContainer());
            cfg.record = row.getRecord();
            if (!(cfg.ui = row.getDefaultCellUI())) {
                delete cfg.ui;
            }
        }
        if (typeof cellCfg === 'string') {
            cfg.xtype = cellCfg;
        } else {
            Ext.apply(cfg, cellCfg);
        }
        return cfg;
    },
    applyScratchCell: function(cell, oldCell) {
        var me = this;
        if (cell) {
            cell = Ext.create(me.createCell());
            if (!cell.printValue) {
                Ext.destroy(cell);
                cell = me.createCell();
                cell.xtype = 'gridcell';
                cell = Ext.create(cell);
            }
            cell.addCls(me.floatingCls);
        }
        if (oldCell) {
            oldCell.destroy();
        }
        return cell;
    },
    printValue: function(value) {
        var me = this,
            row = me.getGrid().dataItems[0],
            cell;
        if (row && row.isGridRow) {
            cell = row.getCellByColumn(me);
        }
        cell = (cell && cell.printValue) ? cell : me.getScratchCell();
        return cell.printValue(value);
    },
    autoSize: function() {
        var me = this,
            max = Math.max,
            textMatrics = new Ext.util.TextMetrics(),
            widthAdjust = 0,
            maxWidth = 0,
            innerCells = me.getCells(),
            grid = me.getGrid(),
            columnIndex, textWidth, rec, store, len, i, records, idx, paddedWidth, cellElement;
        if (!me.getResizable()) {
            return;
        }
        store = grid.getStore();
        columnIndex = me.getDataIndex();
        if (store && columnIndex) {
            if (store.isVirtualStore) {
                records = store.pageMap.pages;
            } else {
                records = store.getData() && store.getData().items;
            }
            if (columnIndex && Ext.isArray(records)) {
                len = records.length;
                for (i = 0; i < len; i++) {
                    textWidth = textMatrics.getWidth(records[i].get(columnIndex));
                    maxWidth = max(maxWidth, textWidth);
                }
            } else if (Ext.isObject(records)) {
                for (idx in records) {
                    rec = records[idx].records;
                    len = rec && rec.length;
                    for (i = 0; i < len; i++) {
                        textWidth = textMatrics.getWidth(rec[i].get(columnIndex));
                        maxWidth = max(maxWidth, textWidth);
                    }
                }
            }
        }
        paddedWidth = me.textElement.dom.offsetWidth + me.titleElement.getPadding('lr');
        maxWidth = max(maxWidth, paddedWidth);
        if (innerCells.length) {
            len = innerCells.length;
            cellElement = innerCells[0].element;
            for (i = 0; i < len; i++) {
                maxWidth = max(maxWidth, innerCells[i].element.getTextWidth());
            }
            if (Ext.supports.ScrollWidthInlinePaddingBug) {
                widthAdjust += cellElement.getPadding('r');
            }
            if (grid.getColumnLines()) {
                widthAdjust += cellElement.getBorderWidth('lr');
            }
            maxWidth += widthAdjust;
        }
        maxWidth = max(maxWidth + 1, me.getMinWidth());
        me.setWidth(maxWidth);
        textMatrics.destroy();
    },
    privates: {
        directionSequence: {
            "null": "ASC",
            "ASC": "DESC",
            "DESC": null
        },
        applySummary: function(summary) {
            if (summary) {
                summary = Ext.Factory.dataSummary(summary);
            }
            return summary;
        },
        beginRefresh: function(context) {
            var me = this,
                grid = me.getGrid();
            context = context || {};
            context.column = me;
            context.grid = grid;
            context.store = grid.store;
            return context;
        },
        canGroup: function() {
            return this.getGroupable() && (this.getDataIndex() || this.getGrouper());
        },
        sort: function(direction, mode) {
            var me = this,
                sorter = me.pickSorter(),
                grid = me.getGrid(),
                store = grid.getStore(),
                sorters = store.getSorters();
            if (!me.isSortable()) {
                return;
            }
            if (sorter.isGrouper) {
                if (sorter.getDirection() !== direction) {
                    sorter.toggle();
                    store.group(sorter);
                }
            }
            else if (direction) {
                if (sorter) {
                    if (sorters.indexOf(sorter) !== 0) {
                        sorter.setDirection(direction);
                    }
                } else {
                    me.setSorter({
                        property: me.getSortParam(),
                        direction: 'ASC'
                    });
                    sorter = me.getSorter();
                }
                store.sort(sorter, mode || grid.getMultiColumnSort() ? 'multi' : 'replace');
            } else {
                if (sorter) {
                    sorters.remove(sorter);
                    if (!store.getRemoteSort()) {
                        me.getRootHeaderCt().setSortState();
                    }
                }
            }
        },
        toggleSortState: function() {
            this.sort(this.directionSequence[this.sortState]);
        },
        setSortState: function(sorter) {
            var me = this,
                store = me.getGrid().getStore(),
                grouper = store.isGrouped() && store.getGrouper(),
                oldDirection = me.sortState,
                direction = null,
                sortedCls = me.sortedCls,
                secondarySortCls = me.secondarySortCls,
                auxSortCls = me.auxSortCls,
                ascCls = sortedCls + '-asc',
                descCls = sortedCls + '-desc',
                ariaDom = me.ariaEl.dom,
                sortPrioClass = '',
                changed, index,
                remove = [
                    secondarySortCls,
                    auxSortCls
                ],
                add;
            if (sorter) {
                if (typeof sorter === 'string') {
                    direction = sorter;
                } else {
                    if (!sorter.isSorter) {
                        Ext.raise('Must pass a sorter instance into HeaderContainer#saveState');
                    }
                    if (sorter === grouper) {
                        index = 0;
                    } else {
                        index = store.getSorters().indexOf(sorter);
                    }
                    if (index === -1) {
                        Ext.raise("Sorter passed to HeaderContainer#saveState not in grid's store");
                    }
                    direction = sorter.getDirection();
                    sortPrioClass = index === 1 ? secondarySortCls : index > 1 ? auxSortCls : '';
                }
            }
            changed = direction !== oldDirection;
            me.sortState = direction;
            switch (direction) {
                case 'DESC':
                    add = [
                        sortedCls,
                        descCls,
                        sortPrioClass
                    ];
                    remove.push(ascCls);
                    break;
                case 'ASC':
                    add = [
                        sortedCls,
                        ascCls,
                        sortPrioClass
                    ];
                    remove.push(descCls);
                    break;
                default:
                    remove.push(sortedCls, ascCls, descCls);
                    break;
            }
            me.replaceCls(remove, add);
            if (ariaDom) {
                if (direction) {
                    ariaDom.setAttribute('aria-sort', me.ariaSortStates[direction]);
                } else {
                    ariaDom.removeAttribute('aria-sort');
                }
            }
            if (changed) {
                me.fireEvent('sort', me, direction, oldDirection);
            }
        },
        getVisibleCount: function() {
            var columns = this.getInnerItems(),
                len = columns.length,
                count = 0,
                i;
            for (i = 0; i < len; ++i) {
                if (columns[i].isHeaderGroup) {
                    count += columns[i].getVisibleCount();
                } else {
                    count += columns[i].isHidden() ? 0 : 1;
                }
            }
            return count;
        },
        onShow: function() {
            var toShow;
            if (!this.getVisibleCount()) {
                toShow = this.getComponent(0);
                if (toShow) {
                    toShow.show();
                }
            }
        },
        doVisibilityCheck: function() {
            var me = this,
                columns = me.getInnerItems(),
                ln = columns.length,
                i, column;
            for (i = 0; i < ln; i++) {
                column = columns[i];
                if (!column.isHidden()) {
                    if (me.isHidden()) {
                        if (me.initialized) {
                            me.show();
                        } else {
                            me.setHidden(false);
                        }
                    }
                    return;
                }
            }
            me.hide();
            me.rebuildChildColumnsMenu = true;
            me.updateMenuDisabledState();
        },
        onColumnShow: function() {
            var me = this,
                hideShowItem;
            if (me.getVisibleCount() > 0) {
                me.show();
                hideShowItem = me.getHideShowMenuItem(false);
                hideShowItem.setChecked(true);
                hideShowItem.setCheckChangeDisabled(false);
            }
            me.rebuildChildColumnsMenu = true;
            me.updateMenuDisabledState();
        },
        onColumnHide: function(column) {
            var me = this,
                hideShowItem;
            if (me.getVisibleCount() === 0) {
                me.hide();
                hideShowItem = me.getHideShowMenuItem(false);
                hideShowItem.setChecked(false);
                hideShowItem.setCheckChangeDisabled(true);
            }
            me.rebuildChildColumnsMenu = true;
            me.updateMenuDisabledState();
        },
        onColumnMove: function(column) {
            this.rebuildChildColumnsMenu = true;
        },
        scopeReplacer: function(config, original, prop, setter) {
            var me = this,
                name = config[prop];
            if (typeof name === 'string') {
                prop = prop || 'sorterFn';
                setter = setter || 'setSorterFn';
                if (original === config) {
                    config = Ext.apply({}, config);
                }
                config[prop] = function() {
                    var scope = me.resolveListenerScope(),
                        fn = scope && scope[name],
                        ret = 0;
                    if (fn) {
                        this[setter](fn.bind(scope));
                        ret = fn.apply(scope, arguments);
                    } else if (!scope) {
                        Ext.raise('Cannot resolve scope for column ' + me.id);
                    } else {
                        Ext.raise('No such method "' + name + '" on ' + scope.$className);
                    }
                    return ret;
                };
            }
            return config;
        }
    }
});

Ext.define('Ext.grid.filters.Column', {
    override: 'Ext.grid.column.Column',
    config: {
        filter: null
    },
    createFilter: function(config) {
        var me = this,
            filter = me.getFilter(),
            cloned, field, model;
        if (filter !== false) {
            if (!filter || filter === true) {
                cloned = true;
                filter = {};
            } else if (typeof filter === 'string') {
                cloned = true;
                filter = {
                    type: filter
                };
            }
            if (!filter.type) {
                if (!cloned) {
                    cloned = true;
                    filter = Ext.clone(filter);
                }
                if (!(filter.type = me.defaultFilterType || me.columnFilterTypes[me.xtype])) {
                    model = me.getGrid().getStore();
                    model = model && model.getModel();
                    field = me.getDataIndex();
                    if (field && model) {
                        field = model.getField(field);
                        filter.type = me.fieldFilterTypes[field && field.type];
                    }
                }
                if (!filter.type) {
                    filter = false;
                }
            }
            if (config && filter) {
                if (!cloned) {
                    filter = Ext.clone(filter);
                }
                filter = Ext.apply(filter, config);
            }
        }
        return filter;
    },
    privates: {
        columnFilterTypes: {
            booleancolumn: 'boolean',
            datecolumn: 'date',
            numbercolumn: 'number'
        },
        fieldFilterTypes: {
            auto: 'string',
            bool: 'boolean',
            date: 'date',
            'float': 'number',
            number: 'number',
            'int': 'number',
            integer: 'number',
            string: 'string'
        }
    }
}, function() {
    Ext.Factory.define('gridFilters', {
        defaultType: 'string'
    });
});

Ext.define('Ext.grid.cell.Date', {
    extend: Ext.grid.cell.Text,
    xtype: 'datecell',
    isDateCell: true,
    config: {
        format: ''
    },
    updateColumn: function(column, oldColumn) {
        var format;
        this.callParent([
            column,
            oldColumn
        ]);
        if (column && column.isDateColumn) {
            format = column.getFormat();
            if (format !== null) {
                this.setFormat(format);
            }
        }
    },
    applyFormat: function(format) {
        return format || Ext.Date.defaultFormat;
    },
    updateFormat: function(format) {
        if (!this.isConfiguring) {
            this.writeValue();
        }
    },
    formatValue: function(value) {
        return value ? Ext.Date.format(value, this.getFormat()) : '';
    }
});

Ext.define('Ext.grid.column.Date', {
    extend: Ext.grid.column.Column,
    xtype: 'datecolumn',
    isDateColumn: true,
    config: {
        format: null,
        defaultEditor: {
            xtype: 'datepickerfield'
        },
        cell: {
            xtype: 'datecell'
        }
    }
});

Ext.define('Ext.grid.menu.Shared', {
    extend: Ext.menu.Item,
    config: {
        grid: null
    },
    doDestroy: function() {
        this.setGrid(null);
        this.callParent();
    },
    updateGrid: function(grid, oldGrid) {
        var me = this;
        if (oldGrid) {
            oldGrid.removeSharedMenuItem(me);
        }
        me.grid = grid;
        if (grid) {
            grid.addSharedMenuItem(me);
        }
    },
    onBeforeShowColumnMenu: function(menu) {
        menu.add(this);
    },
    onColumnMenuHide: function(menu) {
        if (!this.destroyed) {
            menu.remove(this, false);
        }
    }
});

Ext.define('Ext.grid.menu.Columns', {
    extend: Ext.grid.menu.Shared,
    xtype: 'gridcolumnsmenu',
    iconCls: Ext.baseCSSPrefix + 'headermenu-columns-icon',
    text: 'Columns',
    menu: {},
    updateMenu: function(menu, oldMenu) {
        var me = this;
        me.callParent([
            menu,
            oldMenu
        ]);
        Ext.destroy(me.menuListeners);
        if (menu) {
            me.menuListeners = menu.on({
                checkchange: 'onCheckItem',
                delegate: 'menucheckitem',
                scope: me,
                destroyable: true
            });
        }
    },
    onBeforeShowColumnMenu: function(menu, column, grid) {
        var columns = grid.getHeaderContainer().items.items,
            items = [],
            len = columns.length,
            subMenu = this.getMenu(),
            i, col;
        this.callParent([
            menu,
            column,
            grid
        ]);
        for (i = 0; i < len; ++i) {
            col = columns[i];
            if (col.getHideable()) {
                items.push(col.getHideShowMenuItem());
            }
        }
        subMenu.removeAll(false);
        subMenu.add(items);
    },
    onCheckItem: function(menuItem, checked) {
        menuItem.column.setHidden(!checked);
    }
});

Ext.define('Ext.grid.menu.GroupByThis', {
    extend: Ext.menu.Item,
    xtype: 'gridgroupbythismenuitem',
    iconCls: Ext.baseCSSPrefix + 'headermenu-group-by-this',
    text: 'Group by this field'
});

Ext.define('Ext.grid.menu.ShowInGroups', {
    extend: Ext.menu.CheckItem,
    xtype: 'gridshowingroupsmenuitem',
    hideOnClick: true,
    text: 'Show in groups'
});

Ext.define('Ext.menu.RadioItem', {
    extend: Ext.menu.CheckItem,
    xtype: 'menuradioitem',
    classCls: Ext.baseCSSPrefix + 'menuradioitem',
    nameable: true,
    shareableName: true,
    ariaRole: 'menuitemradio',
    config: {
        group: null,
        allowUncheck: null
    },
    initialize: function() {
        if (!this.getGroup()) {
            Ext.raise('Menu RadioItems must be configured with a group');
        }
        this.callParent();
    },
    privates: {
        onSpace: function(e) {
            if (this.checkboxElement.dom.checked) {
                e.preventDefault();
            }
        },
        updateGroup: function(group) {
            this.name = group;
        },
        onCheckboxChange: function() {
            var checkboxElement = this.checkboxElement.dom,
                isChecked = checkboxElement.checked;
            if (isChecked === this.getChecked() || this.getDisabled()) {
                return;
            }
            if (!isChecked && !this.getAllowUncheck()) {
                checkboxElement.checked = true;
            } else {
                this.callParent();
            }
        },
        onCheckChange: function() {
            var me = this,
                checkboxElement = me.checkboxElement.dom,
                parentMenu = me.getParent(),
                name, groups, siblings, len, i;
            me.getGroup();
            name = me.name;
            if (name && parentMenu && !parentMenu.updatingGroups) {
                groups = {};
                if (checkboxElement.checked) {
                    groups[name] = me.getValue();
                    parentMenu.setGroups(groups);
                } else {
                    siblings = parentMenu.lookupName(name);
                    len = siblings && siblings.length;
                    for (i = 0; i < len && !siblings[i].checkboxElement.dom.checked; i++) {}
                    if (i === len) {
                        groups[name] = null;
                        parentMenu.setGroups(groups);
                    }
                }
            }
            me.callParent();
        }
    }
});

Ext.define('Ext.grid.menu.SortAsc', {
    extend: Ext.menu.RadioItem,
    xtype: 'gridsortascmenuitem',
    iconCls: Ext.baseCSSPrefix + 'headermenu-sort-asc',
    text: 'Sort Ascending',
    value: 'ASC',
    allowUncheck: true,
    group: 'grid-sorters'
});

Ext.define('Ext.grid.menu.SortDesc', {
    extend: Ext.menu.RadioItem,
    xtype: 'gridsortdescmenuitem',
    iconCls: Ext.baseCSSPrefix + 'headermenu-sort-desc',
    text: 'Sort Descending',
    value: 'DESC',
    allowUncheck: true,
    group: 'grid-sorters'
});

Ext.define('Ext.grid.selection.Cells', {
    extend: Ext.dataview.selection.Selection,
    alias: 'selection.cells',
    isCells: true,
    clone: function() {
        var me = this,
            result = new me.self(me.view);
        if (me.startCell) {
            result.startCell = me.startCell.clone();
            result.endCell = me.endCell.clone();
        }
        return result;
    },
    isSelected: function(recordIndex, columnIndex) {
        var range;
        if (this.startCell) {
            if (recordIndex.isGridLocation) {
                columnIndex = recordIndex.columnIndex;
                recordIndex = recordIndex.recordIndex;
            }
            if (!(Ext.isNumber(recordIndex) && Ext.isNumber(columnIndex))) {
                Ext.raise('Cells#isSelected must be passed either a GridLocation of ' + 'a row and column index');
            }
            range = this.getRowRange();
            if (recordIndex >= range[0] && recordIndex <= range[1]) {
                range = this.getColumnRange();
                return (columnIndex >= range[0] && columnIndex <= range[1]);
            }
        }
        return false;
    },
    eachRow: function(fn, scope) {
        var me = this,
            rowRange = me.getRowRange(),
            store = me.view.store,
            rowIdx;
        for (rowIdx = rowRange[0]; rowIdx <= rowRange[1]; rowIdx++) {
            if (fn.call(scope || me, store.getAt(rowIdx)) === false) {
                return;
            }
        }
    },
    eachColumn: function(fn, scope) {
        var colRange = this.getColumnRange(),
            columns = this.view.getVisibleColumns(),
            i;
        for (i = colRange[0]; i <= colRange[1]; i++) {
            if (fn.call(scope || this, columns[i], i) === false) {
                return;
            }
        }
    },
    eachCell: function(fn, scope) {
        var me = this,
            view = me.view,
            store = view.store,
            rowRange = me.getRowRange(),
            colRange = me.getColumnRange(),
            baseLocation, location, rowIdx, colIdx;
        for (rowIdx = rowRange[0]; rowIdx <= rowRange[1]; rowIdx++) {
            baseLocation = new Ext.grid.Location(view, store.getAt(rowIdx));
            for (colIdx = colRange[0]; colIdx <= colRange[1]; colIdx++) {
                location = baseLocation.cloneForColumn(colIdx);
                if (fn.call(scope || me, location, colIdx, rowIdx) === false) {
                    return;
                }
            }
        }
    },
    getFirstRowIndex: function() {
        return this.startCell ? Math.min(this.startCell.recordIndex, this.endCell.recordIndex) : 0;
    },
    getLastRowIndex: function() {
        return this.startCell ? Math.max(this.startCell.recordIndex, this.endCell.recordIndex) : -1;
    },
    getFirstColumnIndex: function() {
        return this.startCell ? Math.min(this.startCell.columnIndex, this.endCell.columnIndex) : 0;
    },
    getLastColumnIndex: function() {
        return this.startCell ? Math.max(this.startCell.columnIndex, this.endCell.columnIndex) : -1;
    },
    privates: {
        clear: function(suppressEvent) {
            var me = this,
                view = me.view,
                changed;
            if (view.getVisibleColumns().length) {
                me.eachCell(function(location) {
                    view.onCellDeselect(location);
                    changed = true;
                });
            }
            me.startCell = me.endCell = null;
            if (changed && !suppressEvent) {
                this.getSelectionModel().fireSelectionChange();
            }
        },
        setRangeStart: function(startCell) {
            this.startCell = (this.endCell = startCell.clone()).clone();
            this.view.onCellSelect(startCell);
            this.fireCellSelection();
        },
        setRangeEnd: function(endCell) {
            var me = this,
                view = me.view,
                store = view.store,
                renderInfo = view.renderInfo,
                maxColIdx = view.getVisibleColumns().length - 1,
                range, lastRange, rowStart, rowEnd, colStart, colEnd, rowIdx, colIdx, location, baseLocation;
            me.endCell = endCell.clone();
            range = me.getRange();
            lastRange = me.lastRange || range;
            rowStart = Math.max(Math.min(range[0][1], lastRange[0][1]), renderInfo.indexTop);
            rowEnd = Math.min(Math.max(range[1][1], lastRange[1][1]), renderInfo.indexBottom - 1);
            colStart = Math.min(range[0][0], lastRange[0][0]);
            colEnd = Math.min(Math.max(range[1][0], lastRange[1][0]), maxColIdx);
            for (rowIdx = rowStart; rowIdx <= rowEnd; rowIdx++) {
                baseLocation = new Ext.grid.Location(view, store.getAt(rowIdx));
                for (colIdx = colStart; colIdx <= colEnd; colIdx++) {
                    location = baseLocation.cloneForColumn(colIdx);
                    if (rowIdx < range[0][1] || rowIdx > range[1][1] || colIdx < range[0][0] || colIdx > range[1][0]) {
                        view.onCellDeselect(location);
                    } else {
                        view.onCellSelect(location);
                    }
                }
            }
            me.lastRange = range;
            me.fireCellSelection();
        },
        extendRange: function(extensionVector) {
            var me = this,
                view = me.view,
                newEndCell;
            if (extensionVector[extensionVector.type] < 0) {
                newEndCell = new Ext.grid.Location(view, {
                    record: me.getLastRowIndex(),
                    column: me.getLastColumnIndex()
                });
                me.startCell = extensionVector.start.clone();
                me.setRangeEnd(newEndCell);
                view.getNavigationModel().setLocation({
                    column: extensionVector.start.columnIndex,
                    record: extensionVector.start.record
                });
            } else {
                me.startCell = new Ext.grid.Location(view, {
                    record: me.getFirstRowIndex(),
                    column: me.getFirstColumnIndex()
                });
                me.setRangeEnd(extensionVector.end);
                view.getNavigationModel().setLocation({
                    column: extensionVector.end.columnIndex,
                    record: extensionVector.end.record
                });
            }
        },
        reduceRange: function(extensionVector) {
            var me = this,
                view = me.view,
                newEndCell;
            if (extensionVector.type === 'rows') {
                newEndCell = new Ext.grid.Location(view, {
                    record: extensionVector.end.recordIndex - 1,
                    column: extensionVector.end.columnIndex
                });
                me.setRangeEnd(newEndCell);
                view.getNavigationModel().setLocation({
                    column: extensionVector.end.columnIndex,
                    record: me.view.getStore().getAt(extensionVector.end.recordIndex - 1)
                });
            } else {
                newEndCell = new Ext.grid.Location(view, {
                    record: extensionVector.end.recordIndex,
                    column: extensionVector.end.columnIndex
                });
                me.setRangeEnd(newEndCell);
                view.getNavigationModel().setLocation({
                    column: extensionVector.end.columnIndex,
                    record: me.view.getStore().getAt(extensionVector.end.recordIndex)
                });
            }
        },
        getRange: function() {
            return [
                [
                    this.getFirstColumnIndex(),
                    this.getFirstRowIndex()
                ],
                [
                    this.getLastColumnIndex(),
                    this.getLastRowIndex()
                ]
            ];
        },
        getRangeSize: function() {
            return this.getCount();
        },
        getRecords: function() {
            var rowRange = this.getRowRange();
            return this.getSelectionModel().getStore().getRange(rowRange[0], rowRange[1]);
        },
        getCount: function() {
            var range = this.getRange();
            return (range[1][0] - range[0][0] + 1) * (range[1][1] - range[0][1] + 1);
        },
        fireCellSelection: function() {
            var me = this,
                selModel = me.getSelectionModel(),
                view = selModel.getView();
            view.fireEvent('cellselection', view, me.getRange());
        },
        selectAll: function() {
            var me = this,
                view = me.view,
                columns = view.getVisibleColumns();
            me.clear();
            me.setRangeStart(new Ext.grid.Location(view, {
                record: 0,
                column: 0
            }));
            me.setRangeEnd(new Ext.grid.Location(view, {
                record: view.store.last(),
                column: columns[columns.length - 1]
            }));
        },
        isAllSelected: function() {
            var start = this.startCell,
                end = this.endCell;
            if (start) {
                if (!start.columnIndex && !start.recordIndex) {
                    return end.columnIndex === end.view.getVisibleColumns().length - 1 && end.recordIndex === end.view.store.getCount() - 1;
                }
            }
            return false;
        },
        getColumnRange: function() {
            return [
                this.getFirstColumnIndex(),
                this.getLastColumnIndex()
            ];
        },
        getLastSelected: function() {
            return this.view.getStore().getAt(this.endCell.recordIndex);
        },
        getRowRange: function() {
            return [
                this.getFirstRowIndex(),
                this.getLastRowIndex()
            ];
        },
        onSelectionFinish: function() {
            var me = this,
                view = me.view;
            if (me.getCount()) {
                me.getSelectionModel().onSelectionFinish(me, new Ext.grid.Location(view, {
                    record: me.getFirstRowIndex(),
                    column: me.getFirstColumnIndex()
                }), new Ext.grid.Location(view, {
                    record: me.getLastRowIndex(),
                    column: me.getLastColumnIndex()
                }));
            } else {
                me.getSelectionModel().onSelectionFinish(me);
            }
        }
    }
});

Ext.define('Ext.grid.selection.Columns', {
    extend: Ext.dataview.selection.Selection,
    alias: 'selection.columns',
    isColumns: true,
    clone: function() {
        var me = this,
            result = new me.self(me.view),
            columns = me.selectedColumns;
        if (columns) {
            result.selectedColumns = Ext.Array.slice(columns);
        }
        return result;
    },
    eachRow: function(fn, scope) {
        var columns = this.selectedColumns;
        if (columns && columns.length) {
            this.view.getStore().each(fn, scope || this);
        }
    },
    eachColumn: function(fn, scope) {
        var me = this,
            columns = me.selectedColumns,
            len, i;
        if (columns) {
            len = columns.length;
            for (i = 0; i < len; i++) {
                if (fn.call(scope || me, columns[i], i) === false) {
                    return false;
                }
            }
        }
    },
    eachCell: function(fn, scope) {
        var me = this,
            view = me.view,
            columns = me.selectedColumns,
            context = new Ext.grid.Location(view),
            len, i;
        if (columns) {
            len = columns.length;
            view.getStore().each(function(record) {
                context = context.clone({
                    record: record
                });
                for (i = 0; i < len; i++) {
                    context = context.clone({
                        column: columns[i]
                    });
                    if (fn.call(scope || me, context, context.columnIndex, context.recordIndex) === false) {
                        return false;
                    }
                }
            });
        }
    },
    isSelected: function(column) {
        var selectedColumns = this.selectedColumns;
        if (column && column.isGridColumn && selectedColumns && selectedColumns.length) {
            return Ext.Array.contains(selectedColumns, column);
        }
        return false;
    },
    getCount: function() {
        var selectedColumns = this.selectedColumns;
        return selectedColumns ? selectedColumns.length : 0;
    },
    getColumns: function() {
        return this.selectedColumns || [];
    },
    privates: {
        add: function(column, suppressEvent) {
            var me = this,
                selModel;
            if (!column.isGridColumn) {
                Ext.raise('Column selection must be passed a grid Column header object');
            }
            selModel = me.getSelectionModel();
            Ext.Array.include((me.selectedColumns || (me.selectedColumns = [])), column);
            me.refreshColumns(column);
            selModel.updateHeaderState();
            if (!suppressEvent) {
                selModel.fireSelectionChange();
                me.fireColumnSelection();
            }
        },
        clear: function(suppressEvent) {
            var me = this,
                selModel = me.getSelectionModel(),
                prevSelection = me.selectedColumns;
            if (prevSelection && prevSelection.length) {
                me.selectedColumns = [];
                me.refreshColumns.apply(me, prevSelection);
                selModel.updateHeaderState();
                if (!suppressEvent) {
                    selModel.fireSelectionChange();
                    me.fireColumnSelection();
                }
            }
        },
        setRangeStart: function(startColumn) {
            var me = this,
                prevSelection = me.getColumns();
            prevSelection.push(startColumn);
            me.clear(true);
            me.startColumn = startColumn;
            me.add(startColumn);
        },
        setRangeEnd: function(endColumn) {
            var me = this,
                prevSelection = me.getColumns(),
                headerCt = this.view.ownerGrid.getHeaderContainer(),
                columns = headerCt.getVisibleColumns(),
                start = headerCt.indexOfLeaf(me.startColumn),
                end = headerCt.indexOfLeaf(endColumn),
                i;
            if (end < start) {
                i = start;
                start = end;
                end = i;
            }
            me.selectedColumns = [];
            for (i = start; i <= end; i++) {
                me.selectedColumns.push(columns[i]);
                prevSelection.push(columns[i]);
            }
            me.refreshColumns.apply(me, prevSelection);
            me.fireColumnSelection();
        },
        isAllSelected: function() {
            var selectedColumns = this.selectedColumns,
                headerContainer;
            if (!selectedColumns) {
                return false;
            }
            headerContainer = this.view.getHeaderContainer();
            return selectedColumns.length === headerContainer.getVisibleColumns().length;
        },
        refreshColumns: function(column) {
            var me = this,
                view = me.view,
                store = view.store,
                renderInfo = view.renderInfo,
                columns = arguments,
                len = columns.length,
                selected = [],
                location, rowIdx, colIdx;
            if (view.rendered) {
                for (colIdx = 0; colIdx < len; colIdx++) {
                    selected[colIdx] = me.isSelected(columns[colIdx]);
                }
                for (rowIdx = renderInfo.indexTop; rowIdx < renderInfo.indexBottom; rowIdx++) {
                    location = new Ext.grid.Location(view, store.getAt(rowIdx));
                    for (colIdx = 0; colIdx < len; colIdx++) {
                        location = location.cloneForColumn(columns[colIdx]);
                        if (selected[colIdx]) {
                            view.onCellSelect(location);
                        } else {
                            view.onCellDeselect(location);
                        }
                    }
                }
            }
        },
        remove: function(column, suppressEvent) {
            var me = this,
                selModel = me.getSelectionModel();
            if (!column.isGridColumn) {
                Ext.raise('Column selection must be passed a grid Column header object');
            }
            if (me.selectedColumns) {
                Ext.Array.remove(me.selectedColumns, column);
                if (column.getGrid() && column.isVisible()) {
                    me.refreshColumns(column);
                    selModel.updateHeaderState();
                    if (!suppressEvent) {
                        selModel.fireSelectionChange();
                        me.fireColumnSelection();
                    }
                }
            }
        },
        fireColumnSelection: function() {
            var me = this,
                selModel = me.getSelectionModel(),
                view = selModel.getView();
            view.fireEvent('columnselection', view, me.selectedColumns);
        },
        selectAll: function() {
            var me = this;
            me.clear();
            me.selectedColumns = me.getSelectionModel().lastContiguousColumnRange = me.view.getHeaderContainer().getVisibleColumns();
            me.refreshColumns.apply(me, me.selectedColumns);
        },
        extendRange: function(extensionVector) {
            var me = this,
                columns = me.view.getHeaderContainer().getVisibleColumns(),
                i;
            for (i = extensionVector.start.columnIndex; i <= extensionVector.end.columnIndex; i++) {
                me.add(columns[i]);
            }
        },
        reduceRange: function(extensionVector) {
            var me = this,
                columns = me.view.getHeaderContainer().getVisibleColumns(),
                startIdx = extensionVector.start.columnIndex,
                endIdx = extensionVector.end.columnIndex,
                reduceTo = Math.abs(startIdx - endIdx) + 1,
                diff = me.selectedColumns.length - reduceTo,
                i;
            for (i = diff; i > 0; i--) {
                me.remove(columns[endIdx + i]);
            }
        },
        onSelectionFinish: function() {
            var me = this,
                range = me.getContiguousSelection(),
                start, end;
            if (range) {
                start = new Ext.grid.Location(me.view, {
                    record: 0,
                    column: range[0]
                });
                end = new Ext.grid.Location(me.view, {
                    record: me.view.getStore().getCount() - 1,
                    column: range[1]
                });
                me.getSelectionModel().onSelectionFinish(me, start, end);
            } else {
                me.getSelectionModel().onSelectionFinish(me);
            }
        },
        getContiguousSelection: function() {
            var selection = Ext.Array.sort(this.getColumns(), function(c1, c2) {
                    var c1Grid = c1.getGrid().ownerGrid,
                        c1IndexOfLeaf = c1Grid.getHeaderContainer().indexOfLeaf(c1),
                        c2Grid = c2.getGrid().ownerGrid,
                        c2IndexOfLeaf = c2Grid.getHeaderContainer().indexOfLeaf(c2);
                    return c1IndexOfLeaf - c2IndexOfLeaf;
                }),
                len = selection.length,
                i;
            if (len) {
                for (i = 1; i < len; i++) {
                    if (selection[i].getVisibleIndex() !== selection[i - 1].getVisibleIndex() + 1) {
                        return false;
                    }
                }
                return [
                    selection[0],
                    selection[len - 1]
                ];
            }
        }
    }
});

Ext.define('Ext.grid.selection.Replicator', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.selectionreplicator',
    init: function(grid) {
        this.gridListeners = grid.on({
            beforeselectionextend: this.onBeforeSelectionExtend,
            scope: this,
            destroyable: true
        });
    },
    onBeforeSelectionExtend: function(ownerGrid, sel, extension) {
        var columns = this.columns = [];
        sel.eachColumn(function(column) {
            columns.push(column);
        });
        return this.replicateSelection(ownerGrid, sel, extension);
    },
    replicateSelection: function(ownerGrid, sel, extension) {
        var me = this,
            columns, colCount, j, column, values, startIdx, endIdx, selFirstRowIdx, selLastRowIdx, i, increment, store, record, prevValues, prevValue, selectedRowCount, lastTwoRecords, x, y;
        if (extension.columns || sel.isColumns) {
            return;
        }
        columns = me.columns;
        selFirstRowIdx = sel.getFirstRowIndex();
        selLastRowIdx = sel.getLastRowIndex();
        selectedRowCount = selLastRowIdx - selFirstRowIdx + 1;
        lastTwoRecords = [];
        colCount = columns.length;
        store = columns[0].getGrid().getStore();
        if (selectedRowCount === 1) {
            values = me.getColumnValues(sel.view.getStore().getAt(selFirstRowIdx));
        } else {
            values = new Array(colCount);
            if (extension.rows < 0) {
                lastTwoRecords = [
                    store.getAt(selFirstRowIdx + 1),
                    store.getAt(selFirstRowIdx)
                ];
            } else {
                lastTwoRecords = [
                    store.getAt(selLastRowIdx - 1),
                    store.getAt(selLastRowIdx)
                ];
            }
            lastTwoRecords[0] = me.getColumnValues(lastTwoRecords[0]);
            lastTwoRecords[1] = me.getColumnValues(lastTwoRecords[1]);
            for (j = 0; j < colCount; j++) {
                x = lastTwoRecords[1][j];
                y = lastTwoRecords[0][j];
                if (!isNaN(x) && !isNaN(y)) {
                    values[j] = Number(x) - Number(y);
                }
            }
        }
        if (extension.rows < 0) {
            startIdx = extension.end.recordIndex;
            endIdx = extension.start.recordIndex - 1;
            increment = -1;
        } else {
            startIdx = extension.start.recordIndex;
            endIdx = extension.end.recordIndex + 1;
            increment = 1;
        }
        if (selectedRowCount === 1) {
            for (i = startIdx; i !== endIdx; i += increment) {
                record = store.getAt(i);
                for (j = 0; j < colCount; j++) {
                    column = columns[j];
                    if (column.getDataIndex()) {
                        record.set(column.getDataIndex(), values[j]);
                    }
                }
            }
        } else {
            for (i = startIdx; i !== endIdx; i += increment) {
                record = store.getAt(i);
                prevValues = me.getColumnValues(store.getAt(i - increment));
                for (j = 0; j < colCount; j++) {
                    column = columns[j];
                    if (column.getDataIndex()) {
                        prevValue = prevValues[j];
                        if (!isNaN(prevValue)) {
                            record.set(column.getDataIndex(), Ext.coerce(Number(prevValue) + values[j], prevValue));
                        }
                    }
                }
            }
        }
    },
    getColumnValues: function(record) {
        var columns = this.columns,
            len = columns.length,
            i, column,
            result = new Array(columns.length);
        for (i = 0; i < len; i++) {
            column = columns[i];
            if (column.getDataIndex()) {
                result[i] = record.get(column.getDataIndex());
            }
        }
        return result;
    },
    destroy: function() {
        this.gridListeners = Ext.destroy(this.gridListeners);
        this.callParent();
    }
});

Ext.define('Ext.grid.selection.SelectionExtender', {
    maskBox: {},
    constructor: function(config) {
        var me = this,
            view = config.view,
            handleListeners = {
                dragstart: 'onDragStart',
                dragend: 'onDragEnd',
                scope: me
            };
        Ext.apply(me, config);
        me.el = view.outerCt;
        me.handle = view.bodyElement.createChild({
            cls: Ext.baseCSSPrefix + 'selmodel-extender-drag-handle'
        }).hide();
        if (Ext.supports.Touch) {
            handleListeners.longpress = 'onHandleLongpress';
        }
        me.handle.on(handleListeners);
        me.mask = view.outerCt.createChild({
            cls: Ext.baseCSSPrefix + 'selmodel-extender-mask'
        }).hide();
        me.scrollListener = view.getScrollable().on({
            scroll: me.onViewScroll,
            scope: me,
            destroyable: true
        });
        me.viewListener = view.on({
            columnresize: 'alignHandle',
            columnhide: 'alignHandle',
            columnshow: 'alignHandle',
            columnmove: 'alignHandle',
            scope: me,
            destroyable: true
        });
        if (config && config.axes) {
            me.setAxes(config.axes);
        }
    },
    setAxes: function(axes) {
        var me = this;
        me.axes = axes;
        me.extendX = !!(axes & 1);
        me.extendY = !!(axes & 2);
    },
    setHandle: function(firstPos, endPos) {
        var me = this;
        me.firstPos = firstPos;
        me.endPos = endPos;
        if (firstPos && endPos && endPos.getCell(true)) {
            me.curPos = endPos;
            me.alignHandle();
        } else {
            me.disable();
        }
    },
    alignHandle: function() {
        var me = this,
            lastCell = me.endPos;
        if (me.firstPos && lastCell && me.view.isRecordRendered(lastCell.recordIndex)) {
            lastCell = lastCell.clone({
                record: lastCell.record,
                column: lastCell.column
            }).getCell();
            if (lastCell && lastCell.isVisible()) {
                me.enable();
            } else {
                me.disable();
            }
            me.handle.alignTo(lastCell, 'c-br');
        } else {
            me.disable();
        }
    },
    enable: function() {
        this.handle.show();
    },
    disable: function() {
        this.handle.hide();
        this.mask.hide();
    },
    onHandleLongpress: function(e) {
        e.startDrag();
    },
    onDragStart: function(e) {
        if (e.pointerType !== 'touch' || e.longpress) {
            e.claimGesture();
            this.handle.on('drag', this.onDrag, this);
        }
    },
    onDrag: function(e) {
        var me = this,
            target, view, scrollClientRegion, touch, realTarget, overCell, scrollTask, thresh, scrollDelta, scrollBy;
        if (e.changedTouches) {
            touch = e.changedTouches[0];
            if (touch && !Ext.fly(touch.target).getRegion().contains(touch.point)) {
                realTarget = Ext.event.Event.resolveTextNode(Ext.Element.fromPagePoint(touch.pageX, touch.pageY, true));
                if (realTarget) {
                    e.target = realTarget;
                }
            }
        }
        target = e.target;
        view = me.view;
        scrollClientRegion = view.getScrollable().getElement().getClientRegion();
        overCell = new Ext.grid.Location(view, target);
        scrollTask = me.scrollTask || (me.scrollTask = Ext.util.TaskManager.newTask({
            run: me.doAutoScroll,
            scope: me,
            interval: 10
        }));
        thresh = 25 * (window.devicePixelRatio || 1);
        scrollDelta = 3 * (window.devicePixelRatio || 1);
        scrollBy = me.scrollBy || (me.scrollBy = []);
        e.claimGesture();
        me.lastXY = [
            e.pageX,
            e.pageY
        ];
        if (!me.el.contains(target)) {
            scrollBy[0] = scrollBy[1] = 0;
            return scrollTask.stop();
        }
        if (me.lastXY[1] > scrollClientRegion.bottom - thresh) {
            if (me.extendY) {
                scrollBy[1] = scrollDelta;
                scrollTask.start();
            }
        }
        else if (me.lastXY[1] < scrollClientRegion.top + thresh) {
            if (me.extendY) {
                scrollBy[1] = -scrollDelta;
                scrollTask.start();
            }
        }
        else if (me.lastXY[0] > scrollClientRegion.right - thresh) {
            if (me.extendX) {
                scrollBy[0] = scrollDelta;
                scrollTask.start();
            }
        }
        else if (me.lastXY[0] < scrollClientRegion.left + thresh) {
            if (me.extendX) {
                scrollBy[0] = -scrollDelta;
                scrollTask.start();
            }
        } else {
            scrollBy[0] = scrollBy[1] = 0;
            scrollTask.stop();
        }
        if (overCell && overCell.getCell() && !overCell.equals(me.lastOverCell)) {
            me.lastOverCell = overCell;
            me.syncMaskOnCell(overCell);
        }
    },
    doAutoScroll: function() {
        var me = this,
            view = me.view,
            scroller = view.getScrollable(),
            scrollOverCell;
        scroller.scrollBy.apply(scroller, me.scrollBy);
        scrollOverCell = document.elementFromPoint.apply(document, me.lastXY);
        if (scrollOverCell) {
            scrollOverCell = new Ext.grid.Location(me.view, scrollOverCell);
            if (scrollOverCell && scrollOverCell.getCell() && !scrollOverCell.equals(me.lastOverCell)) {
                me.lastOverCell = scrollOverCell;
                me.syncMaskOnCell(scrollOverCell);
            }
        }
    },
    onDragEnd: function(e) {
        var me = this,
            selectable = me.view.getSelectable(),
            selection = selectable && selectable.getSelection();
        me.handle.un('drag', me.onDrag, me);
        if (me.scrollTask) {
            me.scrollTask.stop();
        }
        if (me.extensionDescriptor) {
            me.disable();
            if ((selection.isColumns && e.direction.y < 0) || selection.isRows && e.direction.x < 0) {
                me.alignHandle();
                return;
            }
            selectable.extendSelection(me.extensionDescriptor);
        }
    },
    onViewScroll: function() {
        var me = this;
        if ((me.active && me.lastOverCell) || me.firstPos) {
            me.endPos = me.endPos.clone({
                record: me.endPos.recordIndex
            });
            me.alignHandle();
        }
    },
    stopEvent: function(e) {
        e.stopEvent();
    },
    syncMaskOnCell: function(overCell) {
        var me = this,
            view = me.view,
            renderInfo = view.renderInfo,
            maskBox = me.maskBox,
            startRecordIndex = me.firstPos.recordIndex,
            endRecordIndex = me.endPos.recordIndex,
            extensionStart = me.firstPos.clone({
                record: startRecordIndex
            }),
            extensionEnd = me.endPos.clone({
                record: endRecordIndex
            }),
            preventReduce = !me.allowReduceSelection,
            selRegion, firstCell, firstCellEl, endCell, endCellEl, curPos;
        firstCell = me.firstPos.clone({
            record: Ext.Number.constrain(Math.min(startRecordIndex, endRecordIndex), renderInfo.indexTop, renderInfo.indexBottom - 1),
            column: me.firstPos.column
        });
        endCell = me.endPos.clone({
            record: Ext.Number.constrain(Math.max(firstCell.recordIndex, endRecordIndex), renderInfo.indexTop, renderInfo.indexBottom - 1)
        });
        firstCellEl = firstCell.getCell();
        endCellEl = endCell.getCell();
        me.selectionRegion = selRegion = firstCellEl.getRegion().union(endCellEl.getRegion());
        me.curPos = curPos = overCell;
        overCell = overCell.getCell('el');
        me.mask.dom.style.borderTopWidth = me.mask.dom.style.borderRightWidth = me.mask.dom.style.borderBottomWidth = me.mask.dom.style.borderLeftWidth = '';
        if (curPos.recordIndex < me.firstPos.recordIndex && me.extendY) {
            me.extensionDescriptor = {
                type: 'rows',
                start: extensionStart.clone({
                    record: curPos.recordIndex
                }),
                end: extensionEnd.clone({
                    record: me.firstPos.recordIndex - 1
                }),
                rows: curPos.recordIndex - me.firstPos.recordIndex,
                mousePosition: me.lastXY
            };
            me.mask.dom.style.borderBottomWidth = '0';
            maskBox.x = selRegion.x;
            maskBox.y = overCell.getY();
            maskBox.width = selRegion.right - selRegion.left;
            maskBox.height = selRegion.top - overCell.getY();
        }
        else if (curPos.recordIndex > me.endPos.recordIndex && me.extendY) {
            me.extensionDescriptor = {
                type: 'rows',
                start: extensionStart.clone({
                    record: me.endPos.recordIndex + 1
                }),
                end: extensionEnd.clone({
                    record: curPos.recordIndex
                }),
                rows: curPos.recordIndex - me.endPos.recordIndex,
                mousePosition: me.lastXY
            };
            me.mask.dom.style.borderTopWidth = '0';
            maskBox.x = selRegion.x;
            maskBox.y = selRegion.bottom;
            maskBox.width = selRegion.right - selRegion.left;
            maskBox.height = overCell.getRegion().bottom - selRegion.bottom;
        }
        else if (!preventReduce && curPos.recordIndex < me.endPos.recordIndex && me.extendY && curPos.columnIndex === me.endPos.columnIndex) {
            me.extensionDescriptor = {
                type: 'rows',
                start: extensionStart.clone({
                    record: me.endPos.recordIndex
                }),
                end: extensionEnd.clone({
                    record: curPos.recordIndex + 1
                }),
                rows: -1,
                mousePosition: me.lastXY,
                reduce: true
            };
            me.mask.dom.style.borderTopWidth = '0';
            maskBox.x = selRegion.x;
            maskBox.y = selRegion.top;
            maskBox.width = selRegion.right - selRegion.left;
            maskBox.height = overCell.getRegion().bottom - selRegion.top;
        } else {
            if (curPos.columnIndex < me.firstPos.columnIndex && me.extendX) {
                me.extensionDescriptor = {
                    type: 'columns',
                    start: extensionStart.clone({
                        column: curPos.columnIndex
                    }),
                    end: extensionEnd.clone({
                        column: me.firstPos.columnIndex - 1
                    }),
                    columns: curPos.columnIndex - me.firstPos.columnIndex,
                    mousePosition: me.lastXY
                };
                me.mask.dom.style.borderRightWidth = '0';
                maskBox.x = overCell.getX();
                maskBox.y = selRegion.top;
                maskBox.width = selRegion.left - overCell.getX();
                maskBox.height = selRegion.bottom - selRegion.top;
            }
            else if (curPos.columnIndex > me.endPos.columnIndex && me.extendX) {
                me.extensionDescriptor = {
                    type: 'columns',
                    start: extensionStart.clone({
                        column: me.endPos.columnIndex + 1
                    }),
                    end: extensionEnd.clone({
                        column: curPos.columnIndex
                    }),
                    columns: curPos.columnIndex - me.endPos.columnIndex,
                    mousePosition: me.lastXY
                };
                me.mask.dom.style.borderLeftWidth = '0';
                maskBox.x = selRegion.right;
                maskBox.y = selRegion.top;
                maskBox.width = overCell.getRegion().right - selRegion.right;
                maskBox.height = selRegion.bottom - selRegion.top;
            }
            else if (!preventReduce && curPos.columnIndex < me.endPos.columnIndex && me.extendX) {
                me.extensionDescriptor = {
                    type: 'columns',
                    start: extensionStart.clone({
                        column: me.firstPos.columnIndex
                    }),
                    end: extensionEnd.clone({
                        column: curPos.columnIndex
                    }),
                    columns: -1,
                    mousePosition: me.lastXY,
                    reduce: true
                };
                me.mask.dom.style.borderLeftWidth = '0';
                maskBox.x = selRegion.left;
                maskBox.y = selRegion.top;
                maskBox.width = overCell.getRegion().right - selRegion.left;
                maskBox.height = selRegion.bottom - selRegion.top;
            } else {
                me.extensionDescriptor = null;
            }
        }
        if (view.hasListeners.selectionextenderdrag) {
            view.fireEvent('selectionextenderdrag', view, view.getSelectable().getSelection(), me.extensionDescriptor);
        }
        if (me.extensionDescriptor) {
            me.mask.show();
            me.mask.setBox(maskBox);
        } else {
            me.mask.hide();
        }
    },
    destroy: function() {
        this.destroyMembers('viewListener', 'scrollListener', 'mask', 'handle');
    }
});

Ext.define('Ext.grid.cell.Number', {
    extend: Ext.grid.cell.Text,
    xtype: 'numbercell',
    isNumberCell: true,
    config: {
        format: '0,000.00'
    },
    classCls: Ext.baseCSSPrefix + 'numbercell',
    zeroValue: null,
    updateColumn: function(column, oldColumn) {
        var format;
        this.callParent([
            column,
            oldColumn
        ]);
        if (column && column.isNumberColumn) {
            format = column.getFormat();
            if (format !== null) {
                this.setFormat(format);
            }
        }
    },
    updateFormat: function(format) {
        if (!this.isConfiguring) {
            this.writeValue();
        }
    },
    formatValue: function(value) {
        var hasValue = value || value === 0,
            zeroValue;
        if (value === 0 && (zeroValue = this.getZeroValue()) !== null) {
            value = zeroValue || '';
        } else {
            value = hasValue ? Ext.util.Format.number(value, this.getFormat()) : '';
        }
        return value;
    }
});

Ext.define('Ext.grid.cell.Check', {
    extend: Ext.grid.cell.Base,
    xtype: 'checkcell',
    config: {
        disabled: null
    },
    innerTemplate: [
        {
            reference: 'checkboxElement',
            tabIndex: -1,
            cls: Ext.baseCSSPrefix + 'checkbox-el ' + Ext.baseCSSPrefix + 'font-icon'
        }
    ],
    classCls: Ext.baseCSSPrefix + 'checkcell',
    disabledCls: Ext.baseCSSPrefix + 'disabled',
    checkedCls: Ext.baseCSSPrefix + 'checked',
    constructor: function(config) {
        this.callParent([
            config
        ]);
        this.checkboxElement.on('tap', 'onTap', this);
    },
    applyValue: function(value) {
        return !!value;
    },
    updateValue: function(value, oldValue) {
        var me = this,
            column = me.getColumn();
        me.el.toggleCls(me.checkedCls, !!value);
        if (value) {
            column.updateHeaderState();
        } else {
            column.setHeaderStatus(value);
        }
    },
    updateColumn: function(column, oldColumn) {
        this.callParent([
            column,
            oldColumn
        ]);
        if (column) {
            this.setDisabled(column.getDisabled());
        }
    },
    applyDisabled: function(disabled) {
        return Boolean(disabled);
    },
    updateDisabled: function(disabled) {
        this.element.toggleCls(this.disabledCls, disabled);
    },
    disable: function() {
        this.setDisabled(true);
    },
    enable: function() {
        this.setDisabled(false);
    },
    onTap: function(e) {
        var me = this,
            record = me.getRecord(),
            column = me.getColumn(),
            recordIndex = column.up('grid').getStore().indexOf(record),
            checked;
        if (record) {
            checked = !column.isRecordChecked(record);
            if (me.getDisabled()) {
                return;
            }
            if (column.fireEvent('beforecheckchange', me, recordIndex, checked, record, e) !== false) {
                if (me.getColumn().getStopSelection()) {
                    e.stopSelection = true;
                }
                if (record) {
                    column.setRecordChecked(record, checked, e);
                }
                if (column.hasListeners.checkchange) {
                    column.fireEvent('checkchange', me, recordIndex, checked, record, e);
                }
            }
        }
    }
});

Ext.define('Ext.grid.column.Check', {
    extend: Ext.grid.column.Column,
    isCheckColumn: true,
    xtype: 'checkcolumn',
    cachedConfig: {
        headerCheckboxAlign: 'bottom'
    },
    config: {
        stopSelection: true,
        headerCheckbox: false
    },
    align: 'center',
    classCls: Ext.baseCSSPrefix + 'checkcolumn',
    noHeaderCheckboxCls: Ext.baseCSSPrefix + 'no-header-checkbox',
    checkedCls: Ext.baseCSSPrefix + 'checked',
    hasTextCls: Ext.baseCSSPrefix + 'has-text',
    checkboxAlignCls: {
        top: Ext.baseCSSPrefix + 'checkbox-align-top',
        right: Ext.baseCSSPrefix + 'checkbox-align-right',
        bottom: Ext.baseCSSPrefix + 'checkbox-align-bottom',
        left: Ext.baseCSSPrefix + 'checkbox-align-left'
    },
    text: '',
    ignoreExport: true,
    cell: {
        xtype: 'checkcell'
    },
    afterTitleTemplate: [
        {
            reference: 'checkboxElement',
            classList: [
                Ext.baseCSSPrefix + 'checkbox-el',
                Ext.baseCSSPrefix + 'font-icon'
            ]
        }
    ],
    onColumnTap: function(e) {
        var me = this;
        if ((e.target === me.checkboxElement.dom) && !me.getDisabled()) {
            me.toggleAll(e);
        }
        me.callParent([
            e
        ]);
    },
    toggleAll: function(e) {
        var me = this,
            checked = !me.allChecked;
        if (me.fireEvent('beforeheadercheckchange', me, checked, e) !== false) {
            me.doToggleAll(checked);
            me.setHeaderStatus(checked);
            me.fireEvent('headercheckchange', me, checked, e);
        }
    },
    doToggleAll: function(checked) {
        var me = this,
            store = me.getGrid().getStore();
        store.each(function(record) {
            me.setRecordChecked(record, checked);
        });
    },
    setRecordChecked: function(record, checked, e) {
        checked = !!checked;
        this.doSetRecordChecked(record, checked);
        if (checked) {
            this.updateHeaderState();
        } else {
            this.setHeaderStatus(checked);
        }
    },
    doSetRecordChecked: function(record, checked) {
        var dataIndex = this.getDataIndex();
        if (record.get(dataIndex) !== checked) {
            record.set(dataIndex, checked);
        }
    },
    areAllChecked: function() {
        var me = this,
            store = me.getGrid().getStore(),
            records, len, i;
        if (store && !store.isVirtualStore && store.getCount() > 0) {
            records = store.getData().items;
            len = records.length;
            for (i = 0; i < len; ++i) {
                if (!me.isRecordChecked(records[i])) {
                    return false;
                }
            }
            return true;
        }
    },
    isRecordChecked: function(record) {
        return record.get(this.getDataIndex());
    },
    updateHeaderState: function() {
        if (!this.destroyed && (this.getHeaderCheckbox() !== false)) {
            this.setHeaderStatus(this.areAllChecked());
        }
    },
    setHeaderStatus: function(checked) {
        var me = this;
        if (me.allChecked !== checked) {
            me.allChecked = checked;
            me.el.toggleCls(me.checkedCls, checked);
        }
    },
    updateDisabled: function(disabled, oldDisabled) {
        var me = this,
            grid = me.getGrid(),
            rows, len, i;
        me.callParent([
            disabled,
            oldDisabled
        ]);
        if (grid) {
            rows = grid.getViewItems();
            len = rows.length;
            for (i = 0; i < len; i++) {
                rows[i].getCellByColumn(me).setDisabled(disabled);
            }
        }
    },
    updateHeaderCheckboxAlign: function(align, oldAlign) {
        var me = this,
            checkboxAlignCls = me.checkboxAlignCls;
        if (oldAlign) {
            me.removeCls(checkboxAlignCls[oldAlign]);
        }
        if (align) {
            if (!checkboxAlignCls[align]) {
                Ext.raise("Invalid value for checkboxAlign: '" + align + "'");
            }
            me.addCls(checkboxAlignCls[align]);
        }
    },
    updateHeaderCheckbox: function(headerCheckbox) {
        var me = this,
            grid = me.getGrid();
        me.el.toggleCls(me.noHeaderCheckboxCls, !headerCheckbox);
        me.setSortable(me.getSortable() && !headerCheckbox);
        if (grid) {
            me.updateHeaderState();
        }
    },
    updateText: function(text) {
        this.setHtml(text);
        this.toggleCls(this.hasTextCls, !!text);
    }
});

Ext.define('Ext.grid.column.Selection', {
    extend: Ext.grid.column.Check,
    xtype: 'selectioncolumn',
    classCls: Ext.baseCSSPrefix + 'selectioncolumn',
    cell: {
        cls: Ext.baseCSSPrefix + 'selection-cell'
    },
    weight: -900,
    menu: null,
    sortable: false,
    draggable: false,
    resizable: false,
    hideable: false,
    ignore: true,
    stopSelection: false,
    updateHeaderState: function() {
        if (!this.isConfiguring) {
            this.getGrid().getSelectable().updateHeaderState();
        }
    },
    toggleAll: function(e) {
        this.getGrid().getSelectable().toggleAll(this, e);
    },
    setRecordChecked: function(record, checked, e) {
        var selectionModel = this.getGrid().getSelectable();
        if (checked) {
            selectionModel.select(record, selectionModel.getMode() !== 'single');
        } else {
            selectionModel.deselect(record);
        }
    },
    isRecordChecked: function(record) {
        return this.getGrid().getSelectable().isRowSelected(record);
    }
});

Ext.define('Ext.grid.column.Number', {
    extend: Ext.grid.column.Column,
    xtype: 'numbercolumn',
    isNumberColumn: true,
    config: {
        format: null
    },
    cell: {
        xtype: 'numbercell'
    },
    defaultEditor: {
        xtype: 'numberfield'
    }
});

Ext.define('Ext.grid.cell.RowNumberer', {
    extend: Ext.grid.cell.Number,
    xtype: 'rownumberercell',
    classCls: Ext.baseCSSPrefix + 'rownumberercell',
    format: '0,000',
    refreshValue: function(context) {
        var row = context.row,
            ret;
        if (context.summary) {
            ret = '\xa0';
        } else {
            ret = row ? row.$datasetIndex + 1 : null;
        }
        return ret;
    }
});

Ext.define('Ext.grid.column.RowNumberer', {
    extend: Ext.grid.column.Number,
    xtype: 'rownumberer',
    isRowNumberer: true,
    cell: {
        xtype: 'rownumberercell'
    },
    menu: null,
    align: 'right',
    hideable: false,
    ignore: true,
    ignoreExport: true,
    sortable: false,
    text: '',
    width: 'auto',
    minWidth: null,
    onAdded: function(parent, instanced) {
        var me = this,
            grid;
        me.callParent([
            parent,
            instanced
        ]);
        me.checkWidth();
        grid = me.getGrid();
        me.gridListeners = grid.on({
            storechange: 'attachStoreListeners',
            scope: me,
            destroyable: true
        });
        me.attachStoreListeners(grid.getStore());
    },
    onRemoved: function(destroying) {
        Ext.destroy(this.gridListeners, this.storeListeners);
        this.callParent([
            destroying
        ]);
    },
    privates: {
        attachStoreListeners: function(store) {
            Ext.destroy(this.storeListeners);
            if (store) {
                this.storeListeners = store.on({
                    datachanged: 'checkWidth',
                    totalcountchange: 'checkWidth',
                    scope: this,
                    destroyable: true
                });
            }
        },
        getCharWidth: function() {
            var me = this,
                charWidth = me._charWidth,
                text, cell, cellUi, gridUi, textWidth;
            if (!charWidth) {
                text = '0000000000';
                cell = me.getScratchCell();
                cellUi = me.getCell().ui;
                if (cellUi) {
                    cell.addUi(cellUi);
                }
                gridUi = me.getGrid().getUi();
                if (gridUi) {
                    cell.addUi(gridUi);
                }
                document.body.appendChild(cell.el.dom);
                textWidth = Ext.util.TextMetrics.measure(cell.bodyElement, text).width;
                document.body.removeChild(cell.el.dom);
                me._charWidth = charWidth = textWidth / text.length;
            }
            return charWidth;
        },
        checkWidth: function() {
            var me = this;
            if (document.fonts) {
                document.fonts.ready.then(function() {
                    if (!me.destroyed) {
                        me.doCheckWidth();
                    }
                });
            } else {
                me.doCheckWidth();
            }
        },
        doCheckWidth: function() {
            var me = this,
                store = me.getGrid().getStore(),
                charLen = 1,
                charWidth = me.getCharWidth();
            if (store && store.getTotalCount()) {
                charLen = me.getScratchCell().printValue(store.getTotalCount()).length;
            }
            me.textElement.setStyle('min-width', Math.ceil(charLen * charWidth) + 'px');
        }
    }
});

Ext.define('Ext.grid.selection.Model', {
    extend: Ext.dataview.selection.Model,
    alias: 'selmodel.grid',
    isGridSelectionModel: true,
    config: {
        columns: {
            $value: false,
            lazy: true
        },
        cells: {
            $value: false,
            lazy: true
        },
        rows: {
            $value: true,
            lazy: true
        },
        drag: false,
        extensible: {
            $value: false,
            lazy: true
        },
        reducible: true,
        checkbox: false,
        headerCheckbox: true,
        checkboxDefaults: {
            xtype: 'selectioncolumn',
            text: null,
            width: 30
        },
        showNumbererColumn: false
    },
    checkboxSelect: false,
    checkboxColumnIndex: 0,
    mode: 'multi',
    columnSelectCls: Ext.baseCSSPrefix + 'selmodel-column-select',
    rowNumbererHeaderCls: Ext.baseCSSPrefix + 'selmodel-row-numberer-hd',
    updateView: function(view, oldView) {
        var me = this,
            rowNumberer = me.numbererColumn = view.getRowNumbers(),
            checkbox = me.getCheckbox();
        me.callParent([
            view,
            oldView
        ]);
        if (oldView) {
            me.navigationModel = null;
            Ext.destroy(me.viewListeners);
        }
        if (view) {
            if (rowNumberer) {
                rowNumberer.setCell({
                    cls: me.rowNumbererCellCls
                });
                rowNumberer.setCls(me.rowNumbererHeaderCls);
            }
            if (checkbox) {
                view.registerColumn(checkbox);
            }
            me.viewListeners = view.on(me.getViewListeners());
        }
    },
    onViewCreated: function(view) {
        if (this.getColumns()) {
            view.addCls(this.columnSelectCls);
        }
        this.updateHeaderState();
    },
    updateDrag: function(drag) {
        var view = this.getView(),
            viewListeners = {
                dragstart: 'onViewDragStart',
                delegate: view.eventDelegate,
                scope: this
            };
        if (Ext.supports.Touch) {
            viewListeners.longpress = 'onViewLongpress';
        }
        view.innerCt[drag ? 'on' : 'un'](viewListeners);
    },
    getSelection: function(what, reset) {
        var config, result;
        if (what === 'rows' || what === 'records') {
            what = this.getStore().isVirtualStore ? 'rows' : 'records';
        }
        result = this.callParent();
        if (what) {
            what = what.toLowerCase();
            if (!result || result.type !== what) {
                config = {
                    type: what
                };
                if (what === 'records') {
                    config.selected = this.getSelected();
                }
                this.setSelection(config);
                result = this.callParent();
            } else if (reset) {
                result.clear(true);
            }
        }
        return result;
    },
    createCheckboxColumn: function(checkboxDefaults) {
        var me = this;
        return Ext.apply({
            headerCheckbox: me.getHeaderCheckbox() !== false
        }, checkboxDefaults);
    },
    onHeaderTap: function(headerCt, header, e) {
        var me = this,
            sel = me.getSelection(),
            isSelected = false,
            range, columns, i;
        if (header === this.numbererColumn) {
            me.toggleAll(header, e);
        }
        else if (me.getColumns() && header !== me.getCheckbox()) {
            if (e.shiftKey && sel && sel.lastColumnSelected) {
                if (!e.ctrlKey) {
                    sel.clear();
                }
                headerCt = me.getView().getHeaderContainer();
                columns = headerCt.getColumns();
                range = Ext.Array.sort([
                    headerCt.indexOfLeaf(sel.lastColumnSelected),
                    headerCt.indexOf(header)
                ], Ext.Array.numericSortFn);
                for (i = range[0]; i <= range[1]; i++) {
                    me.selectColumn(columns[i], true);
                }
            } else {
                isSelected = me.isColumnSelected(header);
                if (!e.ctrlKey) {
                    sel.clear();
                } else if (isSelected) {
                    me.deselectColumn(header);
                    me.getSelection().lastColumnSelected = null;
                }
                if (!isSelected || !e.ctrlKey && e.pointerType !== 'touch') {
                    me.selectColumn(header, e.ctrlKey);
                    me.getSelection().lastColumnSelected = header;
                }
                me.updateSelectionExtender();
            }
        }
    },
    toggleAll: function(header, e) {
        var me = this,
            sel = me.getSelection();
        e.stopEvent();
        if (!sel || !sel.isAllSelected()) {
            me.selectAll();
        } else {
            me.deselectAll();
        }
        me.updateHeaderState();
        me.lastColumnSelected = null;
    },
    selectByLocation: function(location) {
        if (!location.isGridLocation) {
            Ext.raise('selectByLocation MUST be passed an Ext.grid.Location');
        }
        var me = this,
            record = location.record,
            column = location.column;
        if (me.getCells()) {
            me.selectCells(location, location);
        } else if (me.getRows() && record) {
            this.select(record);
        } else if (me.getColumns() && column) {
            me.selectColumn(column);
        }
    },
    updateHeaderState: function() {
        var me = this,
            store = me.getStore(),
            sel = me.getSelection(),
            isChecked = false,
            checkHd = me.getCheckbox(),
            storeCount;
        if (store && sel && sel.isRows) {
            storeCount = store.getCount();
            if (store.isBufferedStore) {
                isChecked = sel.allSelected;
            } else {
                isChecked = storeCount > 0 && (storeCount === sel.getCount());
            }
        }
        if (checkHd) {
            checkHd.setHeaderStatus(isChecked);
        }
    },
    onColumnUpdate: function(headerCt, columns) {
        var me = this,
            checkColumn = me.getCheckbox();
        if (checkColumn) {
            if (headerCt) {
                headerCt.remove(checkColumn, false);
            }
            columns.push(checkColumn);
        }
    },
    select: function(records, keepExisting, suppressEvent) {
        var me = this,
            sel = me.getSelection('records'),
            store = me.getStore(),
            len, i, record;
        if (!Ext.isArray(records)) {
            records = [
                records
            ];
        }
        len = records.length;
        for (i = 0; i < len; i++) {
            record = records[i];
            if (typeof record === 'number') {
                records[i] = record = store.getAt(record);
            }
        }
        sel.add(records, keepExisting, suppressEvent);
    },
    deselect: function(records, suppressEvent) {
        var me = this,
            sel = me.getSelection('records'),
            store = me.getView().getStore(),
            len, i, record;
        if (sel && sel.isRecords) {
            if (!Ext.isArray(records)) {
                records = [
                    records
                ];
            }
            len = records.length;
            for (i = 0; i < len; i++) {
                record = records[i];
                if (typeof record === 'number') {
                    records[i] = record = store.getAt(record);
                }
            }
        }
        sel.remove(records, suppressEvent);
    },
    onCollectionRemove: function(selectedCollection, chunk) {
        this.updateHeaderState();
        this.callParent([
            selectedCollection,
            chunk
        ]);
    },
    onCollectionAdd: function(selectedCollection, adds) {
        this.updateHeaderState();
        this.callParent([
            selectedCollection,
            adds
        ]);
    },
    selectCells: function(rangeStart, rangeEnd, suppressEvent) {
        var me = this,
            view = me.getView(),
            sel;
        rangeStart = rangeStart.isGridLocation ? rangeStart.clone() : new Ext.grid.Location(view, {
            record: rangeStart[0],
            column: rangeStart[1]
        });
        rangeEnd = rangeEnd.isGridLocation ? rangeEnd.clone() : new Ext.grid.Location(view, {
            record: rangeEnd[0],
            column: rangeEnd[1]
        });
        me.resetSelection(true);
        sel = me.getSelection('cells');
        sel.setRangeStart(rangeStart);
        sel.setRangeEnd(rangeEnd);
        if (!suppressEvent) {
            me.fireSelectionChange();
        }
    },
    selectAll: function(suppressEvent) {
        var me = this,
            sel = me.getSelection(),
            doSelect;
        if (me.getRows()) {
            sel = me.getSelection('records');
            doSelect = true;
        } else if (me.getCells()) {
            sel = me.getSelection('cells');
            doSelect = true;
        } else if (me.getColumns()) {
            sel = me.getSelection('columns');
            doSelect = true;
        }
        if (doSelect) {
            sel.selectAll(suppressEvent);
        }
    },
    deselectAll: function(suppressEvent) {
        var sel = this.getSelection();
        if (sel && sel.getCount()) {
            sel.clear(suppressEvent);
        }
    },
    selectRows: function(rows, keepSelection, suppressEvent) {
        var sel = this.getSelection('records');
        if (!keepSelection) {
            this.resetSelection(true);
        }
        sel.add(rows, keepSelection, suppressEvent);
    },
    isSelected: function(record) {
        return this.isRowSelected(record);
    },
    selectColumn: function(column, keepSelection, suppressEvent) {
        var selData = this.getSelection('columns');
        if (!selData.isSelected(column)) {
            if (!keepSelection) {
                selData.clear(suppressEvent);
                selData.setRangeStart(column);
            } else {
                selData.add(column);
            }
        }
    },
    deselectColumn: function(column, suppressEvent) {
        var selData = this.getSelection();
        if (selData && selData.isColumns && selData.isSelected(column)) {
            selData.remove(column, suppressEvent);
        }
    },
    destroy: function() {
        var me = this,
            view = me.getView(),
            checkbox = me.checkbox;
        if (view && !view.destroying && checkbox) {
            view.unregisterColumn(checkbox, true);
        }
        Ext.destroy(me.viewListeners, me.getConfig('extensible', null, true));
        me.callParent();
    },
    privates: {
        axesConfigs: {
            x: 1,
            y: 2,
            xy: 3,
            both: 3,
            "true": 3
        },
        getViewListeners: function() {
            return {
                columnschanged: 'onColumnsChanged',
                columnmove: 'onColumnMove',
                scope: this,
                destroyable: true
            };
        },
        refreshSelection: function() {
            if (this.getSelection().isRecords) {
                this.callParent();
            } else {
                this.resetSelection();
            }
        },
        onColumnsChanged: function() {
            var me = this,
                selData = me.getSelection(),
                view, selectionChanged;
            if (selData) {
                view = selData.view;
                if (selData.isCells) {
                    if (view.visibleColumns().length) {
                        selData.eachCell(function(location) {
                            view.onCellDeselect(location);
                        });
                    } else {
                        me.clearSelections();
                    }
                }
                else if (selData.isColumns) {
                    selectionChanged = false;
                    selData.eachColumn(function(column) {
                        if (!column.isVisible() || !view.isAncestor(column)) {
                            me.remove(column);
                            selectionChanged = true;
                        }
                    });
                }
            }
            Ext.on('idle', selectionChanged ? me.fireSelectionChange : me.updateSelectionExtender, me, {
                single: true
            });
        },
        onColumnMove: function() {
            this.updateSelectionExtender();
        },
        resetSelection: function(suppressEvent) {
            var sel = this.getSelection();
            if (sel) {
                sel.clear(suppressEvent);
            }
        },
        onViewLongpress: function(e) {
            if (e.pointerType === 'touch') {
                e.startDrag();
            }
        },
        onViewDragStart: function(e) {
            if (e.pointerType === 'touch' && !e.longpress) {
                return;
            }
            var me = this,
                view = me.getView(),
                location = new Ext.grid.Location(view, e),
                header = location.column,
                viewLocation = view.getNavigationModel().getLocation(),
                isCheckClick = header === me.getCheckbox(),
                resumingSelection = false,
                sel;
            if (!location.cell) {
                return;
            }
            if (e.claimed || e.button > 0 || e.altKey || (viewLocation && viewLocation.actionable) || !view.shouldSelectItem(e)) {
                return;
            }
            if (header) {
                e.claimGesture();
                me.mousedownPosition = location.clone();
                if (isCheckClick) {
                    me.checkCellClicked = location.cell.element.dom;
                }
                if (header === me.numbererColumn || isCheckClick || !me.getCells()) {
                    if (me.getRows()) {
                        if (e.shiftKey && me.isSelected(location.record)) {
                            resumingSelection = true;
                        } else if (!e.shiftKey && !isCheckClick && me.checkboxOnly) {
                            return;
                        }
                        sel = me.getSelection('records');
                        if (!e.shiftKey && !e.ctrlKey && !isCheckClick) {
                            sel.clear();
                        }
                    } else if (me.getColumns()) {
                        sel = me.getSelection('columns');
                        if (e.shiftKey && me.isColumnSelected(location.column)) {
                            resumingSelection = true;
                        } else if (!e.shiftKey && !e.ctrlKey && !isCheckClick) {
                            sel.clear();
                        }
                    } else {
                        return false;
                    }
                } else {
                    sel = me.getSelection('cells');
                    if (e.shiftKey && me.isCellSelected(location.recordIndex, location.columnIndex)) {
                        resumingSelection = true;
                    } else if (!e.shiftKey) {
                        sel.clear();
                    }
                }
                if (!resumingSelection) {
                    me.lastDragLocation = null;
                }
                if (e.longpress) {
                    location.row.removeCls(view.pressedCls);
                    me.onViewSelectionDrag(e);
                }
                if (sel) {
                    view.innerCt.on('dragend', me.onViewDragEnd, me, {
                        single: true
                    });
                    me.mousemoveListener = view.innerCt.on({
                        drag: 'onViewSelectionDrag',
                        scope: me,
                        delegate: view.eventDelegate,
                        destroyable: true
                    });
                }
            }
        },
        onViewSelectionDrag: function(e) {
            var me = this,
                view = me.getView(),
                newLocation, touch, realTarget;
            if (e.changedTouches) {
                touch = e.changedTouches[0];
                if (touch && !Ext.fly(touch.target).getRegion().contains(touch.point)) {
                    realTarget = Ext.event.Event.resolveTextNode(Ext.Element.fromPagePoint(touch.pageX, touch.pageY, true));
                    if (realTarget) {
                        e.target = realTarget;
                    }
                }
            }
            me.stopAutoScroller();
            if (!Ext.fly(e.target).up(view.eventDelegate)) {
                me.scrollTowardsPointer(e, view);
                return;
            }
            newLocation = me.dragLocation = new Ext.grid.Location(view, e);
            me.changeSelectionRange(view, newLocation, e);
        },
        changeSelectionRange: function(view, location, e) {
            var me = this,
                overColumn = location.column,
                overRecord = location.record,
                overRowIdx = location.recordIndex,
                lastDragLocation = me.lastDragLocation,
                selData, lastOverRecord, lastOverColumn, recChange, colChange;
            e.claimGesture();
            if (lastDragLocation) {
                lastOverRecord = lastDragLocation.record;
                lastOverColumn = lastDragLocation.column;
            }
            if (me.checkCellClicked) {
                selData = me.getSelection('rows');
                selData.setRangeStart(me.getStore().indexOf(overRecord));
                me.checkCellClicked = null;
                return;
            }
            selData = me.getSelection();
            if (me.getExtensible()) {
                me.getExtensible().disable();
            }
            if (overColumn) {
                recChange = overRecord !== lastOverRecord;
                colChange = overColumn !== lastOverColumn;
                if (selData.isRows || selData.isRecords) {
                    if (recChange) {
                        if (lastOverRecord) {
                            selData.setRangeEnd(overRowIdx);
                        } else {
                            selData.setRangeStart(overRowIdx);
                        }
                    }
                }
                else if (selData.isCells) {
                    if (recChange || colChange) {
                        if (lastOverRecord) {
                            selData.setRangeEnd(location);
                        } else {
                            selData.setRangeStart(location);
                        }
                    }
                }
                else if (selData.isColumns) {
                    if (colChange) {
                        if (lastOverColumn) {
                            selData.setRangeEnd(location.column);
                        } else {
                            selData.setRangeStart(location.column);
                        }
                    }
                }
                if (recChange || colChange) {
                    view.getNavigationModel().setLocation(location);
                }
                me.lastDragLocation = location;
            }
        },
        scrollTowardsPointer: function(e, view) {
            var me = this,
                scrollClientRegion = view.getScrollable().getElement().getClientRegion(),
                point = e.getXY(),
                scrollTask = me.scrollTask || (me.scrollTask = Ext.util.TaskManager.newTask({
                    run: me.doAutoScroll,
                    args: [
                        e,
                        view
                    ],
                    scope: me,
                    interval: 10
                })),
                thresh = 25 * (window.devicePixelRatio || 1),
                scrollDelta = 3 * (window.devicePixelRatio || 1),
                scrollBy = me.scrollBy || (me.scrollBy = []);
            e.claimGesture();
            if (point[1] > scrollClientRegion.bottom - thresh) {
                scrollBy[0] = 0;
                scrollBy[1] = scrollDelta;
                scrollTask.start();
            }
            else if (point[1] < scrollClientRegion.top + thresh) {
                scrollBy[0] = 0;
                scrollBy[1] = -scrollDelta;
                scrollTask.start();
            }
            else if (point[0] > scrollClientRegion.right - thresh) {
                scrollBy[0] = scrollDelta;
                scrollBy[1] = 0;
                scrollTask.start();
            } else if (point[0] < scrollClientRegion.left + thresh) {
                scrollBy[0] = -scrollDelta;
                scrollBy[1] = 0;
                scrollTask.start();
            }
        },
        doAutoScroll: function(e, view) {
            var me = this,
                scrollClientRegion = view.getScrollable().getElement().getClientRegion(),
                scroller = view.getScrollable(),
                xy = [],
                cell, location;
            scroller.scrollBy.apply(scroller, me.scrollBy);
            if (me.scrollBy[0]) {
                xy[0] = me.scrollBy[0] > 0 ? scrollClientRegion.right - 5 : scrollClientRegion.left + 5;
            } else {
                xy[0] = e.getX();
            }
            if (me.scrollBy[1]) {
                xy[1] = me.scrollBy[1] > 0 ? scrollClientRegion.bottom - 5 : scrollClientRegion.top + 5;
            } else {
                xy[1] = e.getY();
            }
            cell = document.elementFromPoint.apply(document, xy);
            if (cell) {
                cell = Ext.fly(cell).up(view.cellSelector);
                if (!cell) {
                    me.stopAutoScroller();
                    return;
                }
                location = new Ext.grid.Location(view, cell);
                if (cell && !location.equals(me.lastDragLocation)) {
                    me.changeSelectionRange(view, location, e);
                }
            }
        },
        stopAutoScroller: function() {
            var me = this;
            if (me.scrollTask) {
                me.scrollBy[0] = me.scrollBy[1] = 0;
                me.scrollTask.stop();
                me.scrollTask = null;
            }
        },
        onViewDragEnd: function(e) {
            var me = this,
                view = me.getView(),
                dragLocation = me.dragLocation,
                changedCell = !dragLocation || !dragLocation.equals(me.mousedownPosition),
                location = e.location,
                sel;
            me.checkCellClicked = null;
            me.stopAutoScroller();
            if (view && !view.destroyed) {
                if (!location) {
                    e.location = new Ext.grid.Location(view, e);
                }
                if (me.getExtensible() && changedCell) {
                    me.getExtensible().disable();
                }
                me.mousemoveListener.destroy();
                if ((sel = me.getSelection()) && sel.isRows) {
                    sel.addRange(true);
                }
                else if (changedCell) {
                    me.fireSelectionChange();
                }
            }
        },
        onNavigate: function(navigateEvent) {
            var me = this,
                view = me.getView(),
                store = me.getStore(),
                selectingRows = me.getRows(),
                selectingCells = me.getCells(),
                selectingColumns = me.getColumns(),
                checkbox = me.getCheckbox(),
                checkboxOnly = me.checkboxOnly,
                mode = me.getMode(),
                location = navigateEvent.to,
                toColumn = location.column,
                record = location.record,
                sel = me.getSelection(),
                ctrlKey = navigateEvent.ctrlKey,
                shiftKey = navigateEvent.shiftKey,
                adding = true,
                isSpace = navigateEvent.getKey() === navigateEvent.SPACE,
                count, changedRow, selectionChanged, selected, continueLocation;
            if (navigateEvent.stopSelection || toColumn === me.checkboxColumn) {
                return;
            }
            if (!navigateEvent.pointerType && !isSpace) {
                if (ctrlKey) {
                    return;
                }
                changedRow = !navigateEvent.from || (location.recordIndex !== navigateEvent.from.recordIndex);
                if (!changedRow && !(selectingCells || selectingColumns)) {
                    return;
                }
            }
            if (sel && (sel.isCells || (sel.isColumns && selectingRows && !(ctrlKey || shiftKey))) && sel.getCount() > 1 && !shiftKey && navigateEvent.type === 'click') {
                return;
            }
            if (!(selectingCells || selectingColumns || selectingRows) || !record || navigateEvent.type === 'mousedown') {
                return;
            }
            if (ctrlKey && navigateEvent.keyCode === navigateEvent.A && mode === 'multi') {
                if (!sel || sel.getCount() < 2) {
                    me.selectAll();
                } else {
                    me.deselectAll();
                }
                me.updateHeaderState();
                return;
            }
            if (shiftKey && mode === 'multi') {
                if (toColumn === me.numbererColumn || toColumn === me.checkColumn || !(selectingCells || selectingColumns) || (sel && (sel.isRows || sel.isRecords))) {
                    if (selectingRows) {
                        if (toColumn !== checkbox && checkboxOnly) {
                            return;
                        }
                        sel = me.getSelection('records');
                        if (!sel.getRangeSize()) {
                            if (me.selectionStart == null) {
                                me.selectionStart = location.recordIndex;
                            }
                            sel.setRangeStart(me.selectionStart);
                        } else {
                            continueLocation = new Ext.grid.Location(view, me.getLastSelected());
                            sel.setRangeStart(continueLocation.recordIndex);
                        }
                        sel.setRangeEnd(location.recordIndex);
                        selectionChanged = true;
                    }
                } else {
                    if (selectingCells) {
                        sel = me.getSelection('cells');
                        count = sel.getCount();
                        if (!sel.getRangeSize()) {
                            sel.setRangeStart(navigateEvent.from || new Ext.grid.Location(me.getView(), {
                                record: 0,
                                column: 0
                            }));
                        }
                        sel.setRangeEnd(location);
                        adding = count < sel.getCount();
                        selectionChanged = true;
                    } else if (selectingColumns) {
                        sel = me.getSelection('columns');
                        if (!sel.getCount()) {
                            sel.setRangeStart(toColumn);
                        }
                        sel.setRangeEnd(toColumn);
                        selectionChanged = true;
                    }
                }
            } else {
                me.selectionStart = null;
                if (sel && (mode !== 'multi' || !ctrlKey) && !isSpace) {
                    sel.clear(true);
                }
                if (selectingRows && (toColumn === me.numbererColumn || toColumn === checkbox || !selectingCells)) {
                    if (toColumn !== checkbox && checkboxOnly || (navigateEvent.keyCode && navigateEvent.from && record === navigateEvent.from.record)) {
                        return;
                    }
                    sel = me.getSelection('records');
                    if (sel.isSelected(record)) {
                        if (ctrlKey || toColumn === checkbox || me.getDeselectable()) {
                            sel.remove(record);
                            selectionChanged = true;
                        }
                    } else {
                        sel.add(record, ctrlKey || toColumn === checkbox);
                        selectionChanged = true;
                    }
                    if (selectionChanged && (selected = sel.getSelected()) && selected.length) {
                        me.selectionStart = store.indexOf(selected.first());
                        sel.setRangeStart(me.selectionStart);
                    }
                } else {
                    if (selectingCells) {
                        sel = me.getSelection('cells', true);
                        sel.setRangeStart(location);
                        selectionChanged = true;
                    } else if (selectingColumns) {
                        sel = me.getSelection('columns');
                        if (ctrlKey) {
                            if (sel.isSelected(toColumn)) {
                                sel.remove(toColumn);
                            } else {
                                sel.add(toColumn);
                            }
                        } else {
                            sel.setRangeStart(toColumn);
                        }
                        selectionChanged = true;
                    }
                }
            }
            if (selectionChanged) {
                if (!sel.isRecords) {
                    me.fireSelectionChange(null, adding);
                }
            }
            me.lastDragLocation = location;
        },
        isColumnSelected: function(column) {
            var me = this,
                sel = me.getSelection(),
                ret = false;
            if (sel && sel.isColumns) {
                ret = sel.isSelected(column);
            }
            return ret;
        },
        isCellSelected: function(row, column) {
            var sel = this.getSelection();
            if (sel) {
                if (sel.isColumns) {
                    if (typeof column === 'number') {
                        column = this.getView().getVisibleColumns()[column];
                    }
                    return sel.isSelected(column);
                }
                if (sel.isCells) {
                    return sel.isSelected(row, column);
                }
                return sel.isSelected(row);
            }
            return false;
        },
        updateSelection: function(selection, oldSelection) {
            var view = this.getView();
            Ext.destroy(oldSelection);
            if (selection && selection.getCount()) {
                view = selection.view;
                if (selection.isRows) {
                    selection.eachRow(view.onRowSelect, view);
                }
                else if (selection.isColumns) {
                    selection.eachCell(view.onCellSelect, view);
                }
                else if (selection.isCells) {
                    selection.eachCell(view.onCellSelect, view);
                }
            }
        },
        updateRows: function(rows) {
            var sel;
            if (!rows) {
                this.setCheckbox(false);
                sel = this.getSelection();
                if (sel && sel.isRows) {
                    sel.clear();
                }
            }
        },
        updateColumns: function(columns) {
            var me = this,
                view = me.getView(),
                sel = me.getSelection();
            if (!columns && sel && sel.isColumns) {
                sel.clear();
                me.fireSelectionChange();
            }
            view.toggleCls(me.columnSelectCls, !!columns);
        },
        updateCells: function(cells) {
            var me = this,
                sel = me.getSelection();
            if (!cells && sel && sel.isCells) {
                sel.clear();
                me.fireSelectionChange();
            }
        },
        updateMode: function(mode) {
            if (mode === 'multi') {
                this.setDrag(this.getInitialConfig().drag);
            }
            else if (!this.isConfiguring) {
                this.setDrag(false);
            }
        },
        fireSelectionChange: function(records, selecting) {
            var me = this,
                view = me.getView(),
                sel = me.getSelection();
            me.updateSelectionExtender();
            me.fireEvent('selectionchange', view, me.getSelection());
            if (sel.isCells) {
                view.fireEvent('selectionchange', view, sel.getRange(), selecting, sel);
            } else {
                view.fireEvent('selectionchange', view, sel.isRecords ? records : (sel.isCells ? sel.getRecords() : null), selecting, me.getSelection());
            }
        },
        updateSelectionExtender: function() {
            var sel = this.getSelection();
            if (sel) {
                sel.onSelectionFinish();
            }
        },
        onSelectionFinish: function(sel, firstCell, lastCell) {
            var extensible = this.getExtensible();
            if (extensible) {
                extensible.setHandle(firstCell, lastCell);
            }
        },
        applyExtensible: function(extensible, oldExtensible) {
            var me = this,
                axes;
            if (!extensible) {
                return undefined;
            }
            if (extensible === true || typeof extensible === 'string') {
                axes = me.axesConfigs[extensible];
                if (oldExtensible) {
                    oldExtensible.setAxes(axes);
                    return oldExtensible;
                }
                extensible = {
                    axes: axes
                };
            } else {
                extensible = Ext.Object.chain(extensible);
            }
            extensible.allowReduceSelection = me.getReducible();
            extensible.view = me.getView();
            if (oldExtensible) {
                oldExtensible.destroy();
            }
            return new Ext.grid.selection.SelectionExtender(extensible);
        },
        applyReducible: function(reducible) {
            return !!reducible;
        },
        updateReducible: function(reducible) {
            var extensible;
            extensible = this.getConfig('extensible', null, true);
            if (extensible) {
                extensible.allowReduceSelection = reducible;
            }
        },
        applyCheckbox: function(checkbox) {
            var me = this;
            if (checkbox) {
                me.checkboxOnly = checkbox === 'only';
                me.checkboxColumn = checkbox = Ext.create(me.createCheckboxColumn(me.getCheckboxDefaults()));
            }
            return checkbox;
        },
        updateCheckbox: function(checkbox, oldCheckbox) {
            var me = this,
                view;
            if (!me.isConfiguring) {
                view = me.getView();
                if (oldCheckbox) {
                    view.unregisterColumn(oldCheckbox, true);
                }
                if (checkbox) {
                    view.registerColumn(checkbox);
                    me.setRows(true);
                }
            }
        },
        applyView: function(view) {
            return view.ownerGrid;
        },
        extendSelection: function(extension) {
            var me = this,
                view = me.getView(),
                sel = me.getSelection(),
                action = extension.reduce ? 'reduce' : 'extend';
            if (view.fireEvent('beforeselectionextend', view, sel, extension) !== false) {
                sel[action + 'Range'](extension);
                if (!sel.isRows) {
                    me.fireSelectionChange();
                }
            }
        },
        onIdChanged: function(store, rec, oldId, newId) {
            var sel = this.getSelection();
            if (sel && sel.isRecords) {
                sel.getSelected().updateKey(rec, oldId);
            }
        },
        onSelectionStoreAdd: function() {
            this.callParent(arguments);
            this.updateHeaderState();
        },
        onSelectionStoreClear: function() {
            this.callParent(arguments);
            this.updateHeaderState();
        },
        onSelectionStoreLoad: function() {
            this.callParent(arguments);
            this.updateHeaderState();
        }
    }
}, function(GridModel) {
    var RowNumberer = Ext.ClassManager.get('Ext.grid.column.RowNumberer'),
        cellCls;
    if (RowNumberer) {
        cellCls = Ext.grid.column.RowNumberer.prototype.cellCls;
        GridModel.prototype.rowNumbererCellCls = (cellCls ? (cellCls + ' ') : '') + Ext.baseCSSPrefix + 'selmodel-row-numberer-cell';
    }
});

Ext.define('Ext.grid.plugin.ColumnResizing', {
    extend: Ext.Component,
    alias: [
        'plugin.columnresizing',
        'plugin.gridcolumnresizing'
    ],
    config: {
        grid: null,
        realtime: false
    },
    hasResizingCls: Ext.baseCSSPrefix + 'has-columnresizing',
    resizingCls: Ext.baseCSSPrefix + 'resizing',
    columnSelector: '.' + Ext.baseCSSPrefix + 'gridcolumn',
    resizerSelector: '.' + Ext.baseCSSPrefix + 'gridcolumn .' + Ext.baseCSSPrefix + 'resizer-el',
    init: function(grid) {
        this.setGrid(grid);
        grid.getHeaderContainer().setTouchAction({
            panX: false
        });
    },
    updateGrid: function(grid, oldGrid) {
        var me = this,
            cls = me.hasResizingCls,
            headerContainer, resizeMarker;
        if (oldGrid) {
            headerContainer = oldGrid.getHeaderContainer();
            headerContainer.renderElement.un({
                touchstart: 'onContainerTouchStart',
                scope: me,
                priority: 100
            });
            oldGrid.removeCls(cls);
        }
        if (grid) {
            me._resizeMarker = resizeMarker = grid.resizeMarkerElement;
            me._resizeMarkerParent = resizeMarker.parent();
            headerContainer = grid.getHeaderContainer();
            headerContainer.renderElement.on({
                touchstart: 'onContainerTouchStart',
                scope: me
            });
            grid.addCls(cls);
        }
    },
    onContainerTouchStart: function(e) {
        var me = this,
            gridHeader = me.getGrid().getHeaderContainer(),
            target = e.getTarget(me.columnSelector),
            resizer = e.getTarget(me.resizerSelector),
            column;
        if (resizer && !e.multitouch && target && !me._resizeColumn) {
            column = Ext.Component.from(target);
            if (column && column.getResizable()) {
                me._startColumnWidth = column.getComputedWidth();
                me._minColumnWidth = column.getMinWidth();
                me._maxColumnWidth = column.getMaxWidth();
                me._resizeColumn = column;
                me._startX = e.getX();
                column.addCls(me.resizingCls);
                gridHeader.renderElement.suspendEvent('drag', 'longpress');
                if (!this.getRealtime()) {
                    me._resizeMarker.show();
                    me._resizeMarker.setLeft(column.el.getOffsetsTo(me._resizeMarkerParent)[0] + me._startColumnWidth);
                } else {
                    column.setWidth(me._startColumnWidth);
                }
                me.touchListeners = Ext.getBody().on({
                    touchEnd: 'onTouchEnd',
                    touchMove: 'onTouchMove',
                    scope: me,
                    destroyable: true
                });
            }
        } else if (e.multitouch && me._resizeColumn) {
            me.endResize();
        }
    },
    onTouchMove: function(e) {
        var me = this,
            column = me._resizeColumn,
            resizeAmount;
        if (e.isMultitouch) {
            me.endResize();
        } else if (column) {
            resizeAmount = e.getX() - me._startX;
            me.currentColumnWidth = Math.max(Math.ceil(me._startColumnWidth + resizeAmount), me._minColumnWidth);
            if (me._maxColumnWidth) {
                me.currentColumnWidth = Math.min(me.currentColumnWidth, me._maxColumnWidth);
            }
            if (me.getRealtime()) {
                column.setWidth(me.currentColumnWidth);
                column.renderElement.setWidth(me.currentColumnWidth);
            } else {
                me._resizeMarker.setLeft(column.el.getOffsetsTo(me._resizeMarkerParent)[0] + me.currentColumnWidth);
            }
            column.resizing = true;
            e.claimGesture();
        }
    },
    onTouchEnd: function(e) {
        var column = this._resizeColumn,
            hasResized = e.getX() !== this._startX;
        Ext.destroy(this.touchListeners);
        if (column) {
            this.endResize();
            if (!hasResized) {
                column.onResizerTap(e);
            }
        }
    },
    endResize: function() {
        var me = this,
            column = me._resizeColumn,
            grid = me.getGrid();
        if (column) {
            if (!me.getRealtime()) {
                grid.resizeMarkerElement.hide();
            }
            if (me.currentColumnWidth) {
                column.setFlex(null);
                if (column.resizing) {
                    column.setWidth(me.currentColumnWidth);
                    column.resizing = false;
                } else if (me._resizeColumn.getWidth() === me._startColumnWidth) {
                    column.setWidth(me._startColumnWidth);
                }
            }
            column.removeCls(me.resizingCls);
            me._resizeColumn = null;
        }
    }
});

Ext.define('Ext.dd.ScrollManager', {
    singleton: true,
    scrollTowardsPointer: function(component) {
        var me = this,
            scrollTask = me.scrollTask || (me.scrollTask = Ext.util.TaskManager.newTask({
                run: Ext.dd.ScrollManager.doAutoScroll,
                args: [
                    component
                ],
                scope: me,
                interval: 100
            }));
        scrollTask.start();
    },
    stopAutoScroller: function() {
        var me = this;
        if (me.scrollTask) {
            me.scrollTask.stop();
            me.scrollTask = null;
        }
    },
    doAutoScroll: function(component) {
        var me = this,
            animate = true,
            scrollAmount, position, maxPosition, posDiff, posY, direction, scroller;
        if (!me.info) {
            Ext.dd.ScrollManager.stopAutoScroller.apply(me);
            return;
        }
        direction = Ext.dd.ScrollManager.getScrollDirection(component, me.info);
        scroller = component.getScrollable();
        if (!scroller) {
            scroller = me.getViewScrollable();
        }
        if (!direction || !scroller) {
            return;
        }
        scrollAmount = me.scrollAmount;
        position = scroller.position;
        posY = position.y;
        if (component.isLockedGrid) {
            animate = false;
        }
        if (direction === -1) {
            if (posY >= scrollAmount) {
                scroller.scrollBy(0, -scrollAmount, animate);
            } else if (posY > 0) {
                scroller.scrollBy(0, -posY, animate);
            }
        } else {
            maxPosition = scroller.getMaxPosition();
            posDiff = maxPosition.y - posY;
            if (posDiff > 0 && maxPosition.y >= posY) {
                if (posDiff < scrollAmount) {
                    scrollAmount = posDiff;
                }
                scroller.scrollBy(0, scrollAmount, animate);
            }
        }
    },
    getScrollDirection: function(component, info) {
        var bodyBox = component.bodyElement.getBox(),
            cursorPosition = info.cursor.current,
            currentPos, percentDiff;
        if (cursorPosition.x > bodyBox.right || cursorPosition.x < bodyBox.left) {
            return 0;
        }
        currentPos = cursorPosition.y - bodyBox.y;
        percentDiff = (currentPos / bodyBox.height) * 100;
        return (percentDiff < 15 ? -1 : (percentDiff > 85) ? 1 : 0);
    }
});

Ext.define('Ext.dd.Manager', {
    singleton: true,
    getTargetEl: function(info) {
        var source = info.source,
            pos = info.cursor.current;
        return source.manager.elementFromPoint(pos.x, pos.y);
    },
    getPosition: function(info, targetNode, axis) {
        var cursorPosition = info.cursor.current,
            targetBox = targetNode.element.getBox(),
            posDiff, nodeSize, percentDiff;
        axis = axis || 'y';
        posDiff = cursorPosition[axis] - targetBox[axis];
        nodeSize = targetNode.element[axis === 'y' ? 'getHeight' : 'getWidth']();
        percentDiff = (posDiff / nodeSize) * 100;
        return percentDiff < 50 ? 'before' : 'after';
    },
    toggleTargetNodeCls: function(targetNode, cls, state) {
        var j, clsLen;
        if (Ext.isArray(cls)) {
            clsLen = cls.length;
            for (j = 0; j < clsLen; j++) {
                targetNode.toggleCls(cls[j], state);
            }
        } else {
            targetNode.toggleCls(cls, state);
        }
    },
    getTargetComp: function(info) {
        var targetEl = this.getTargetEl(info),
            targetComp;
        if (targetEl) {
            targetComp = Ext.Component.from(targetEl);
            if (targetComp.isGridCell) {
                targetComp = targetComp.row;
            }
        }
        return targetComp;
    },
    getSourceComp: function(info) {
        return Ext.Component.from(info.eventTarget);
    },
    toggleMarkerCls: function(view, targetNode, cls, state) {
        var me = this,
            record, store, visibleGrid, partnerRow, recIndex, ln, i;
        if (view.isLockedGrid) {
            store = view.getStore();
            record = targetNode.getRecord();
            recIndex = store.indexOf(record);
            if (recIndex !== -1) {
                visibleGrid = view.visibleGrids;
                ln = visibleGrid.length;
                for (i = 0; i < ln; i++) {
                    partnerRow = visibleGrid[i].getItemAt(recIndex);
                    if (partnerRow) {
                        me.toggleTargetNodeCls(partnerRow, cls, state);
                    }
                }
            }
        } else {
            me.toggleTargetNodeCls(targetNode, cls, state);
        }
    },
    toggleProxyCls: function(info, cls, state) {
        var proxy = info.proxy;
        if (proxy && proxy.element) {
            proxy.element.toggleCls(cls, state);
        }
    }
});

Ext.define('Ext.plugin.dd.DragDrop', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.viewdragdrop',
    dragText: undefined,
    enableDrag: true,
    containerScroll: true,
    dropIndicator: null,
    enableDrop: true,
    handle: null,
    groups: null,
    overCls: '',
    scrollAmount: 80,
    activateOnLongPress: (Ext.supports.Touch && Ext.supports.TouchEvents) ? true : false,
    enable: function() {
        var me = this;
        if (me.dragZone) {
            me.dragZone.unlock();
        }
        if (me.dropZone) {
            me.dropZone.unlock();
        }
    },
    disable: function() {
        var me = this;
        if (me.dragZone) {
            me.dragZone.lock();
        }
        if (me.dropZone) {
            me.dropZone.lock();
        }
    },
    destroy: function() {
        var me = this;
        me.dragZone = me.dropZone = Ext.destroy(me.dragZone, me.dropZone);
        me.callParent();
    }
});

Ext.define('Ext.grid.plugin.HeaderReorder', {
    extend: Ext.plugin.dd.DragDrop,
    alias: 'plugin.headerreorder',
    config: {
        grid: null
    },
    handle: '.' + Ext.baseCSSPrefix + 'gridcolumn',
    groups: 'gridHeaderGroup',
    dropIndicator: Ext.baseCSSPrefix + 'grid-column-drop-indicator',
    updateGrid: function(grid, oldGrid) {
        var me = this;
        if (oldGrid) {
            me.dragZone = me.dropZone = Ext.destroy(me.dragZone, me.dropZone);
        }
        if (grid) {
            me.initializeDrag(grid);
        }
    },
    initializeDrag: function(view) {
        var me = this,
            headerCt = view.getHeaderContainer(),
            dragZone = {};
        if (me.enableDrag) {
            if (me.proxy) {
                dragZone.proxy = me.proxy;
            }
            if (me.activateOnLongPress) {
                dragZone.activateOnLongPress = me.activateOnLongPress;
            }
            me.dragZone = new Ext.grid.HeaderDragZone(Ext.apply({
                element: headerCt.bodyElement,
                handle: me.handle,
                groups: me.groups,
                view: view,
                constrain: Ext.getBody()
            }, dragZone));
        }
        if (me.enableDrop) {
            me.dropZone = new Ext.grid.HeaderDropZone({
                element: headerCt.el,
                groups: me.groups,
                view: view,
                dropIndicator: me.dropIndicator
            });
        }
    }
});

Ext.define('Ext.grid.RowHeader', {
    extend: Ext.dataview.ItemHeader,
    xtype: 'rowheader',
    classCls: Ext.baseCSSPrefix + 'rowheader',
    isRowHeader: true,
    toolDefaults: {
        ui: 'itemheader rowheader'
    },
    privates: {
        augmentToolHandler: function(tool, args) {
            this.callParent([
                tool,
                args
            ]);
            args[1].grid = args[1].list;
        },
        getGroupHeaderTplData: function() {
            var data = this.callParent([
                    true
                ]),
                grid = this.parent,
                partners = grid.allPartners || [
                    grid
                ],
                len = partners.length,
                i, p, column;
            if (data) {
                for (i = 0; i < len; ++i) {
                    p = partners[i];
                    column = p.getColumnForField(data.groupField);
                    if (column) {
                        break;
                    }
                }
            }
            if (column) {
                data.columnName = column.getText();
                if (column.printValue) {
                    data.html = column.printValue(data.value);
                }
            } else if (data) {
                data.html = Ext.htmlEncode(data.name);
            }
            return data;
        }
    }
});

Ext.define('Ext.grid.Grid', {
    extend: Ext.dataview.List,
    xtype: 'grid',
    isGrid: true,
    mixins: [
        Ext.mixin.ConfigProxy
    ],
    storeEventListeners: {
        sort: 'onStoreSort'
    },
    config: {
        columns: null,
        columnMenu: {
            cached: true,
            $value: {
                xtype: 'menu',
                weighted: true,
                align: 'tl-bl?',
                hideOnParentHide: false,
                items: {
                    sortAsc: {
                        xtype: 'gridsortascmenuitem',
                        group: 'sortDir',
                        weight: -100
                    },
                    sortDesc: {
                        xtype: 'gridsortdescmenuitem',
                        group: 'sortDir',
                        weight: -90
                    },
                    groupByThis: {
                        xtype: 'gridgroupbythismenuitem',
                        handler: 'column.onGroupByThis',
                        separator: true,
                        weight: -50
                    },
                    showInGroups: {
                        xtype: 'gridshowingroupsmenuitem',
                        handler: 'column.onToggleShowInGroups',
                        weight: -40
                    }
                }
            }
        },
        columnResize: true,
        headerContainer: {
            xtype: 'headercontainer'
        },
        hideHeaders: false,
        enableColumnMove: true,
        hideScrollbar: null,
        itemsFocusable: false,
        title: '',
        titleBar: {
            xtype: 'titlebar',
            docked: 'top'
        },
        sortable: true,
        multiColumnSort: false,
        columnsMenuItem: {
            lazy: true,
            $value: {
                xtype: 'gridcolumnsmenu',
                weight: -80,
                separator: true
            }
        },
        columnLines: null,
        rowNumbers: null
    },
    itemConfig: {
        xtype: 'gridrow'
    },
    groupHeader: {
        xtype: 'rowheader'
    },
    infinite: true,
    navigationModel: 'grid',
    pinnedHeader: {
        xtype: 'rowheader'
    },
    scrollable: true,
    scrollToTopOnRefresh: false,
    striped: true,
    proxyConfig: {
        headerContainer: [
            'reserveScrollbar'
        ]
    },
    selectionModel: 'grid',
    classCls: Ext.baseCSSPrefix + 'grid',
    columnLinesCls: Ext.baseCSSPrefix + 'column-lines',
    getTemplate: function() {
        var template = this.callParent();
        template.push({
            reference: 'resizeMarkerElement',
            className: Ext.baseCSSPrefix + 'resize-marker-el',
            hidden: true
        });
        return template;
    },
    beforeInitialize: function() {
        this.ownerGrid = this;
        this.callParent();
    },
    initialize: function() {
        var me = this,
            columns = me.getColumns(),
            persist = me.registeredColumns,
            titleBar = me.getTitleBar(),
            headerContainer = me.getHeaderContainer(),
            scroller = me.getScrollable(),
            selectable = me.getSelectable();
        me.callParent();
        if (scroller) {
            headerContainer.getScrollable().addPartner(scroller, 'x');
        }
        if (titleBar) {
            me.insert(0, titleBar);
        }
        me.add(headerContainer);
        if (selectable) {
            selectable.onViewCreated(me);
        }
        if (!columns.length && persist && persist.length) {
            headerContainer.add(persist);
        }
    },
    doDestroy: function() {
        this.destroyMembers('columnsMenu', 'columnsMenuItem', 'rowNumbererColumn');
        this.callParent();
    },
    addColumn: function(column) {
        return this.getHeaderContainer().add(column);
    },
    addSharedMenuItem: function(sharedItem) {
        (this.sharedMenuItems || (this.sharedMenuItems = [])).push(sharedItem);
    },
    removeSharedMenuItem: function(sharedItem) {
        var sharedMenuItems = this.sharedMenuItems;
        if (sharedMenuItems) {
            Ext.Array.remove(sharedMenuItems, sharedItem);
        }
    },
    beforeShowColumnMenu: function(column, menu) {
        var me = this,
            i, n, item, sharedMenuItems;
        me.getColumnsMenuItem();
        sharedMenuItems = me.sharedMenuItems;
        for (i = 0 , n = sharedMenuItems && sharedMenuItems.length; i < n; ++i) {
            item = sharedMenuItems[i];
            item.onBeforeShowColumnMenu(menu, column, me);
        }
        return me.fireEvent('beforeshowcolumnmenu', me, column, menu);
    },
    onColumnMenuHide: function(column, menu) {
        var me = this,
            sharedMenuItems = me.sharedMenuItems,
            n = sharedMenuItems && sharedMenuItems.length,
            i, item;
        for (i = 0; i < n; ++i) {
            item = sharedMenuItems[i];
            if (!item.destroyed && !item.destroying && !menu.isHidden()) {
                item.onColumnMenuHide(menu, column, me);
            }
        }
    },
    getColumnForField: function(fieldName) {
        return this.getHeaderContainer().getColumnForField(fieldName);
    },
    getColumns: function(selector) {
        return this.getHeaderContainer().getColumns(selector);
    },
    getVisibleColumns: function() {
        return this.getHeaderContainer().getVisibleColumns();
    },
    insertColumn: function(index, column) {
        return this.getHeaderContainer().insert(index, column);
    },
    insertColumnBefore: function(column, before) {
        var ret;
        if (!before) {
            ret = this.getHeaderContainer().add(column);
        } else {
            ret = before.getParent().insertBefore(column, before);
        }
        return ret;
    },
    mapToCell: function(value, column) {
        var me = this,
            ret;
        if (value) {
            if (value.isGridCell && value.row.getGrid() === me) {
                ret = value;
            } else {
                if (value.isEntity) {
                    value = me.mapToItem(value);
                }
                if (value) {
                    if (value.isGridRow) {
                        column = column || me.getFirstVisibleColumn();
                        if (column) {
                            ret = value.getCellByColumn(column);
                        }
                    } else {
                        ret = Ext.Component.from(value, me.innerCt, 'gridcellbase');
                    }
                }
            }
        }
        return ret || null;
    },
    mapToItem: function(value, as) {
        if (value && value.isGridCell) {
            value = value.row;
        }
        return this.callParent([
            value,
            as
        ]);
    },
    mapToRowBody: function(value) {
        if (value) {
            if (!value.isGridRow) {
                value = this.mapToItem(value);
            }
            if (value && value.isGridRow) {
                value = value.getBody();
            }
        }
        return value || null;
    },
    removeColumn: function(column) {
        return this.getHeaderContainer().remove(column);
    },
    registerActionable: function(actionable) {
        this.getNavigationModel().registerActionable(actionable);
    },
    unregisterActionable: function(actionable) {
        this.getNavigationModel().unregisterActionable(actionable);
    },
    onColumnAdd: function(container, column, columnIndex) {
        var me = this,
            items, ln, i, row;
        if (!me.initializingColumns && !me.destroying) {
            items = me.items.items;
            ln = items.length;
            for (i = 0; i < ln; i++) {
                row = items[i];
                if (row.hasGridCells) {
                    row.insertColumn(columnIndex, column);
                }
            }
            me.onColumnChange('columnadd', [
                me,
                column,
                columnIndex
            ]);
        }
    },
    onColumnHide: function(container, column) {
        var me = this,
            items, ln, i, row;
        if (me.initialized && !me.destroying) {
            items = me.items.items;
            ln = items.length;
            for (i = 0; i < ln; i++) {
                row = items[i];
                if (row.hasGridCells) {
                    row.hideColumn(column);
                }
            }
            me.onColumnChange('columnhide', [
                me,
                column
            ]);
        }
    },
    onColumnMove: function(container, columns, group, fromIdx) {
        var me = this,
            before = null,
            colLen = columns.length,
            items, ln, i, j, row, column, index, leaves;
        if (me.initialized && !me.destroying) {
            items = me.items.items;
            ln = items.length;
            leaves = me.getHeaderContainer().getColumns();
            index = leaves.indexOf(columns[colLen - 1]);
            before = leaves[index + 1] || null;
            for (i = colLen - 1; i >= 0; --i) {
                column = columns[i];
                for (j = 0; j < ln; j++) {
                    row = items[j];
                    if (row.hasGridCells) {
                        row.insertColumnBefore(column, before);
                    }
                }
                me.onColumnChange('columnmove', [
                    me,
                    column,
                    fromIdx + i,
                    leaves.indexOf(column)
                ]);
                before = column;
            }
        }
    },
    onColumnRemove: function(container, column) {
        var me = this,
            items, ln, i, row;
        if (me.initialized && !me.destroying) {
            if (column === me.sortedColumn) {
                me.sortedColumn = null;
            }
            items = me.items.items;
            ln = items.length;
            for (i = 0; i < ln; i++) {
                row = items[i];
                if (row.hasGridCells) {
                    row.removeColumn(column);
                }
            }
            me.onColumnChange('columnremove', [
                me,
                column
            ]);
        }
    },
    onColumnResize: function(container, column, width, oldWidth) {
        var me = this;
        if (!me.destroying) {
            if (oldWidth && !column.getHidden()) {
                if (me.infinite) {
                    me.refreshScrollerSize();
                }
                me.fireEvent('columnresize', me, column, width);
            }
        }
    },
    onColumnShow: function(container, column) {
        var me = this,
            items, ln, i, row;
        if (me.initialized && !me.destroying) {
            items = me.items.items;
            ln = items.length;
            for (i = 0; i < ln; i++) {
                row = items[i];
                if (row.hasGridCells) {
                    row.showColumn(column);
                }
            }
            me.onColumnChange('columnshow', [
                me,
                column
            ]);
        }
    },
    onColumnSort: function(container, column, direction) {
        this.fireEvent('columnsort', this, column, direction);
    },
    onRender: function() {
        var hideHeaders = this._hideHeaders;
        this.callParent();
        if (hideHeaders) {
            this.updateHideHeaders(hideHeaders);
        }
    },
    privates: {
        dataItemMap: {
            header: 1,
            footer: 1
        },
        handleStoreSort: function() {
            if (this.rendered) {
                this.getHeaderContainer().setSortState();
            }
        },
        onStoreGroupChange: function(store, grouper) {
            this.callParent([
                store,
                grouper
            ]);
            this.handleStoreSort();
        },
        onStoreSort: function() {
            this.handleStoreSort();
        },
        registerColumn: function(column) {
            var me = this,
                columns = me.registeredColumns,
                headerCt = me.getHeaderContainer();
            if (!column.isGridColumn) {
                column = Ext.create(column);
            }
            if (!columns) {
                me.registeredColumns = columns = [];
            }
            columns.push(column);
            if (!me.isConfiguring || (headerCt && headerCt.items.getCount())) {
                headerCt.add(column);
            }
            return column;
        },
        unregisterColumn: function(column, destroy) {
            var columns = this.registeredColumns,
                headerCt = this.getHeaderContainer();
            if (!this.destroying) {
                if (columns) {
                    Ext.Array.remove(columns, column);
                }
                if (headerCt) {
                    headerCt.remove(column, destroy === true);
                }
            }
            return column;
        },
        generateSelectorFunctions: function() {
            var me = this;
            me.callParent();
            me.eventDelegate = function(candidate) {
                var comp = Ext.Component.from(candidate),
                    ret = true,
                    row;
                if (!comp || comp === me) {
                    return false;
                }
                if (comp.getRefOwner() === me) {
                    ret = comp.isGridRow || me.dataItemMap[comp.$dataItem];
                } else {
                    row = comp.row;
                    ret = row && row.isGridRow && (row.grid || row.list) === me;
                }
                return ret;
            };
        },
        getFirstVisibleColumn: function() {
            var columns = this.getVisibleColumns();
            return columns.length ? columns[0] : null;
        },
        getLastVisibleColumn: function() {
            var columns = this.getVisibleColumns(),
                len = columns.length;
            return len ? columns[len - 1] : null;
        },
        isFirstVisibleColumn: function(column) {
            return this.getFirstVisibleColumn() === column;
        },
        isLastVisibleColumn: function(column) {
            return this.getLastVisibleColumn() === column;
        },
        createDataItem: function(cfg) {
            var item = this.callParent([
                    cfg
                ]);
            item.grid = this;
            return item;
        },
        onColumnChange: function(changeEvent, eventArgs) {
            var me = this;
            if (changeEvent !== 'columnmove' && changeEvent !== 'columnadd' && changeEvent !== 'columnremove') {
                me.refreshInnerWidth();
            }
            if (!me.isConfiguring) {
                me.fireEventArgs(changeEvent, eventArgs);
            }
            me.clearItemCaches();
        },
        refreshInnerWidth: function() {
            var body = this.getHeaderContainer().bodyElement.dom;
            this.setInnerWidth(Math.max(body.scrollWidth, body.clientWidth));
        },
        onColumnComputedWidthChange: function(changedColumns, totalColumnWidth) {
            var me = this,
                groupingInfo = me.groupingInfo;
            if (!me.destroying) {
                me.setInnerWidth(totalColumnWidth);
                me.setCellSizes(changedColumns, me.items.items);
                me.setCellSizes(changedColumns, me.itemCache);
                if (me.isGrouping()) {
                    me.setCellSizes(changedColumns, groupingInfo.header.unused);
                    me.setCellSizes(changedColumns, groupingInfo.footer.unused);
                }
                if (me.hasListeners.columnlayout) {
                    me.fireEvent('columnlayout', me, changedColumns, totalColumnWidth);
                }
            }
        },
        onCellSelect: function(location) {
            var cell = location.getCell();
            if (cell) {
                cell.addCls(this.selectedCls);
            }
        },
        onCellDeselect: function(location) {
            var cell = location.getCell();
            if (cell) {
                cell.removeCls(this.selectedCls);
            }
        },
        setCellSizes: function(changedColumns, items) {
            var len = items.length,
                changedColCount = changedColumns.length,
                row, i, j;
            for (i = 0; i < len; i++) {
                row = items[i];
                if (row.hasGridCells) {
                    for (j = 0; j < changedColCount; j++) {
                        row.setColumnWidth(changedColumns[j]);
                    }
                }
            }
        },
        updateColumnLines: function(columnLines) {
            this.el.toggleCls(this.columnLinesCls, columnLines);
        },
        updateColumnResize: function(enabled) {
            var me = this,
                plugin = me.findPlugin('columnresizing');
            if (!plugin) {
                if (enabled) {
                    me.addPlugin('columnresizing');
                }
            } else {
                plugin.setGrid(enabled ? me : null);
            }
        },
        updateColumns: function(columns) {
            var me = this,
                header = me.getHeaderContainer(),
                count = columns && columns.length,
                persist = me.registeredColumns;
            if (header) {
                me.rowHeight = null;
                if (header) {
                    header.beginColumnUpdate();
                    if (header.getItems().getCount()) {
                        if (persist) {
                            header.remove(persist, false);
                        }
                        if (count) {
                            header.remove(columns.filter(function(col) {
                                return col.isInstance;
                            }), false);
                        }
                        header.removeAll(true, true);
                    }
                    if (count) {
                        me.initializingColumns = me.isConfiguring;
                        header.setColumns(columns);
                        if (persist) {
                            header.add(persist);
                        }
                        delete me.initializingColumns;
                    }
                    header.endColumnUpdate();
                }
            }
        },
        applyRowNumbers: function(rowNumbers) {
            var me = this;
            if (rowNumbers) {
                rowNumbers = me.rowNumbererColumn = Ext.create(Ext.apply({
                    xtype: 'rownumberer',
                    weight: -1000,
                    editRenderer: me.renderEmpty
                }, rowNumbers));
            }
            return rowNumbers;
        },
        updateRowNumbers: function(rowNumbers, oldRowNumbers) {
            if (oldRowNumbers) {
                this.unregisterColumn(oldRowNumbers, true);
            }
            if (rowNumbers) {
                this.registerColumn(rowNumbers);
            }
        },
        renderEmpty: function() {
            return '\xa0';
        },
        applyColumnsMenuItem: function(config, existing) {
            return Ext.updateWidget(existing, config, this, 'createColumnsMenuItem');
        },
        createColumnsMenuItem: function(config) {
            return Ext.apply({
                grid: this
            }, config);
        },
        applyHeaderContainer: function(config, existing) {
            return Ext.updateWidget(existing, config, this, 'createHeaderContainer');
        },
        createHeaderContainer: function(config) {
            config = this.mergeProxiedConfigs('headerContainer', config, true);
            config.sortable = this.getSortable();
            config.grid = this;
            return config;
        },
        updateHeaderContainer: function(headerContainer) {
            if (headerContainer) {
                headerContainer.on({
                    columnresize: 'onColumnResize',
                    columnshow: 'onColumnShow',
                    columnhide: 'onColumnHide',
                    columnadd: 'onColumnAdd',
                    columnmove: 'onColumnMove',
                    columnremove: 'onColumnRemove',
                    columnsort: 'onColumnSort',
                    scope: this
                });
            }
        },
        updateHideHeaders: function(hideHeaders) {
            if (this.rendered) {
                var headerContainer = this.getHeaderContainer();
                if (hideHeaders) {
                    headerContainer.el.setStyle({
                        marginBottom: '-' + headerContainer.el.measure('h') + 'px'
                    });
                } else {
                    headerContainer.el.setStyle({
                        marginBottom: ''
                    });
                }
            }
        },
        updateHideScrollbar: function(hide) {
            var w = Ext.scrollbar.width();
            this.element.setStyle('margin-right', hide ? -w + 'px' : '');
        },
        updateTitle: function(title) {
            var titleBar = this.getTitleBar();
            if (titleBar) {
                if (title) {
                    titleBar.setTitle(title);
                    if (titleBar.isHidden()) {
                        titleBar.show();
                    }
                } else {
                    titleBar.hide();
                }
            }
        },
        applyTitleBar: function(config, existing) {
            return Ext.updateWidget(existing, config);
        },
        updateTitleBar: function(titleBar) {
            if (titleBar && !titleBar.getTitle()) {
                titleBar.setTitle(this.getTitle());
            }
        },
        applyTotalColumnWidth: function(totalColumnWidth) {
            var rows = this.dataItems;
            return rows.length === 0 ? undefined : totalColumnWidth;
        },
        updateVerticalOverflow: function(value, was) {
            var headerContainer = this.getHeaderContainer(),
                summaryRow = this.findPlugin('summaryrow') || this.findPlugin('gridsummaryrow'),
                scrollable = this.getScrollable(),
                verticalScrollbarWidth = scrollable && scrollable.getScrollbarSize().width,
                y = !!(scrollable && scrollable.getY()),
                addOverflow = y && verticalScrollbarWidth > 0 && value,
                row;
            this.callParent([
                value,
                was
            ]);
            headerContainer.setVerticalOverflow(addOverflow);
            if (summaryRow) {
                row = summaryRow.getRow();
                if (!row.destroyed) {
                    row.rightSpacer.setStyle({
                        width: (addOverflow ? (verticalScrollbarWidth - 1) : 0) + 'px'
                    });
                }
            }
        },
        updateEnableColumnMove: function(enabled) {
            var me = this,
                plugin = me.findPlugin('headerreorder');
            if (!plugin && enabled) {
                plugin = me.addPlugin('headerreorder');
            }
            if (plugin) {
                plugin.setGrid(enabled ? me : null);
            }
        },
        getSelection: function() {
            var me = this,
                selectable = me.getSelectable(),
                selection = selectable.getSelection(),
                selectionType = selection.type;
            if (selectionType === 'columns') {
                return selection.lastColumnSelected;
            }
            if (selectionType === 'cells') {
                return selection.endCell && selection.endCell.record;
            }
            return this.callParent();
        }
    }
}, function(Grid) {
    Grid.prototype.indexModifiedFields = Ext.Array.toMap;
});

Ext.define('Ext.plugin.dd.DragZone', {
    extend: Ext.drag.Source,
    dragMarkerCls: Ext.baseCSSPrefix + 'drag-indicator',
    describe: function(info) {
        var dragData = this.getDragData(info.eventTarget);
        info.setData('dragData', dragData);
    },
    proxy: {
        type: 'placeholder',
        cls: Ext.baseCSSPrefix + 'proxy-drag-el',
        cursorOffset: (Ext.supports.Touch && Ext.supports.TouchEvents) ? [
            44,
            -75
        ] : [
            12,
            20
        ]
    },
    beforeDragStart: function(info) {
        var proxy = this.getProxy();
        if (proxy && proxy.setHtml) {
            proxy.setHtml(this.getDragText(info));
        }
    },
    getDragText: function(info) {
        return '';
    },
    getDragData: Ext.emptyFn
});

Ext.define('Ext.grid.GridDragZone', {
    extend: Ext.plugin.dd.DragZone,
    getViewScrollable: function() {
        var me = this,
            view = me.view,
            scroller = view.getScrollable(),
            item, grid;
        if (!scroller) {
            if (view.isLockedGrid) {
                if (me.ddRow) {
                    item = me.ddRow;
                } else {
                    item = Ext.dd.Manager.getTargetComp(me.info);
                }
                if (item && item.getGrid) {
                    grid = item.getGrid();
                }
                if (grid) {
                    scroller = grid.getScrollable();
                }
            }
        }
        return scroller;
    },
    toggleDragMarker: function(rows, state) {
        var ddManager = Ext.dd.Manager,
            view = this.view,
            row, i;
        for (i = 0; i < rows.length; i++) {
            row = rows[i];
            if (!row.isDestroyed) {
                if (!state) {
                    delete row.isDragging;
                    delete row.draggingRecordId;
                    delete row.dragMarkerCls;
                }
                ddManager.toggleMarkerCls(view, row, this.dragMarkerCls, state);
            }
        }
    },
    getDraggingRows: function(info) {
        var data = info.data.dragData,
            records = data.records || [],
            view = this.view,
            rows = [],
            i, row;
        for (i = 0; i < records.length; i++) {
            row = null;
            if (view.isLockedGrid && view.visibleGrids.length) {
                row = view.visibleGrids[0].itemFromRecord(records[i]);
            } else {
                row = view.itemFromRecord(records[i]);
            }
            if (row) {
                row.isDragging = true;
                row.draggingRecordId = records[i].id;
                row.dragMarkerCls = this.dragMarkerCls;
                rows.push(row);
            }
        }
        return rows;
    },
    onDragStart: function(info) {
        var me = this,
            scroller = me.getViewScrollable();
        if (scroller && scroller.isVirtualScroller) {
            scroller.setDisabled(true);
        }
        if (me.containerScroll) {
            Ext.dd.ScrollManager.scrollTowardsPointer.apply(me, [
                me.view
            ]);
        }
        me.rows = me.getDraggingRows(info);
        me.toggleDragMarker(me.rows, true);
    },
    onDragEnd: function() {
        var me = this,
            scroller = me.getViewScrollable();
        if (scroller && scroller.isVirtualScroller) {
            scroller.setDisabled(false);
        }
        if (me.containerScroll) {
            Ext.dd.ScrollManager.stopAutoScroller.apply(me);
        }
        me.onDragCancel();
    },
    onDragCancel: function() {
        this.toggleDragMarker(this.rows, false);
        this.rows = null;
    },
    getDragData: function(e) {
        var view = this.view,
            cell = Ext.Component.from(e, view),
            selections, record, selectionIndex;
        if (!cell) {
            return;
        }
        record = cell.getRecord();
        selections = view.getSelections();
        if (selections) {
            selectionIndex = selections.indexOf(record);
            record = (selectionIndex !== -1) ? selections : record;
        }
        return {
            eventTarget: e,
            view: view,
            item: cell,
            records: Ext.Array.from(record)
        };
    },
    getDragText: function(info) {
        var data = info.data.dragData,
            count = data.records.length;
        if (Ext.isFunction(this.dragText)) {
            return this.dragText(count, info);
        }
        return Ext.String.format(this.dragText, count, count === 1 ? '' : Ext.util.Inflector.pluralize(''));
    }
});

Ext.define('Ext.grid.GridDropZone', {
    extend: Ext.plugin.dd.DropZone,
    onDragMove: function(info) {
        var me = this,
            ddManager = Ext.dd.Manager,
            targetCmp = ddManager.getTargetComp(info),
            ddRecords, isSameGroup, highlight, store, targetRecord, isValidTarget, positionCls;
        highlight = ddManager.getPosition(info, targetCmp);
        positionCls = me.dropMarkerCls + '-' + highlight;
        if (!targetCmp || targetCmp.hasCls(positionCls)) {
            return;
        }
        if (targetCmp.getRecord) {
            targetRecord = targetCmp.getRecord();
        }
        isSameGroup = Ext.Array.intersect(me.getGroups(), info.source.getGroups()).length;
        if (!targetRecord || !isSameGroup) {
            if (targetCmp.getStore) {
                store = targetCmp.getStore();
            }
            if (!store || (store && store.getCount() > 0)) {
                return;
            }
        }
        ddRecords = info.data.dragData.records;
        isValidTarget = ddRecords.indexOf(targetRecord) === -1;
        if (me.ddEl) {
            me.removeDropMarker();
        }
        if (isValidTarget) {
            me.addDropMarker(targetCmp, [
                me.dropIndicator,
                positionCls
            ]);
            me.ddEl = targetCmp;
        }
    },
    onDrop: function(info) {
        var me = this,
            draggedData, position, targetNode, targetComponent, targetRecord, component;
        if (!me.ddEl) {
            return;
        }
        draggedData = info.data.dragData;
        position = me.ddEl.hasCls(me.dropMarkerCls + '-before') ? 'before' : 'after';
        targetNode = Ext.dd.Manager.getTargetComp(info);
        if (targetNode.isGridRow) {
            targetComponent = targetNode.parent;
        }
        targetRecord = targetNode.getRecord();
        component = me.view;
        if (component.fireEvent('beforedrop', targetNode, draggedData, targetRecord, position) !== false) {
            me.onNodeDrop(draggedData, targetRecord, position, targetComponent || component);
            component.fireEvent('drop', targetNode, draggedData, targetRecord, position);
        }
        me.removeDropMarker();
    },
    onNodeDrop: function(data, record, position, targetComponent) {
        var sourceView = data.view,
            targetStore = targetComponent.getStore(),
            crossView = targetComponent !== sourceView,
            records = data.records,
            removeRecord = crossView || records.length > 1,
            index, i, len, selModel, selectable;
        if (this.copy) {
            len = records.length;
            for (i = 0; i < len; i++) {
                records[i] = records[i].copy();
            }
        } else if (removeRecord) {
            sourceView.getStore().remove(records);
        }
        if (record && position) {
            index = targetStore.indexOf(record);
            if (position !== 'before') {
                index++;
            }
            targetStore.insert(index, records);
        } else {
            targetStore.add(records);
        }
        if (removeRecord) {
            selectable = targetComponent.getSelectable();
            selModel = selectable.getSelection().getSelectionModel();
            selModel.select(records);
        }
    },
    addDropMarker: function(targetNode, positionCls) {
        var me = this,
            ddManager = Ext.dd.Manager;
        ddManager.toggleProxyCls(me.info, me.validDropCls, true);
        ddManager.toggleMarkerCls(me.view, targetNode, positionCls, true);
        if (me.overCls) {
            ddManager.toggleTargetNodeCls(targetNode, me.overCls, true);
        }
    },
    removeDropMarker: function() {
        var me = this,
            prefix = me.dropMarkerCls + '-',
            ddManager = Ext.dd.Manager,
            cls;
        if (me.info) {
            ddManager.toggleProxyCls(me.info, me.validDropCls, false);
        }
        if (me.ddEl) {
            cls = [
                me.dropIndicator,
                prefix + 'before',
                prefix + 'after'
            ];
            ddManager.toggleMarkerCls(me.view, me.ddEl, cls, false);
            if (me.overCls) {
                ddManager.toggleTargetNodeCls(me.ddEl, me.overCls, false);
            }
            me.ddEl = null;
        }
    }
});

Ext.define('Ext.grid.HeaderDragZone', {
    extend: Ext.plugin.dd.DragZone,
    autoDestroy: false,
    resizerCls: Ext.baseCSSPrefix + 'resizer-el',
    maskCls: Ext.baseCSSPrefix + 'mask',
    beforeDragStart: function(info) {
        var targetCmp = Ext.dd.Manager.getSourceComp(info),
            targetEl = targetCmp.renderElement,
            hoveredNodeEl = Ext.dd.Manager.getTargetEl(info),
            isDragSuspended = targetEl.isSuspended('drag') || targetEl.isSuspended('longpress');
        if (isDragSuspended || targetCmp.isDragColumn || targetCmp.getDraggable() === false || Ext.fly(info.eventTarget).hasCls(this.resizerCls) || Ext.fly(hoveredNodeEl).hasCls(this.maskCls)) {
            return false;
        }
        this.callParent([
            info
        ]);
    },
    getDragText: function(info) {
        var targetCmp = Ext.dd.Manager.getTargetComp(info);
        return targetCmp.getText();
    }
});

Ext.define('Ext.grid.HeaderDropZone', {
    extend: Ext.grid.GridDropZone,
    dropMarkerCls: Ext.baseCSSPrefix + 'header-drop-indicator',
    autoDestroy: false,
    isValidDrag: function(targetCmp, sourceCmp) {
        var info = this.info,
            cursor, prevSibling, nextSibling, box, diff;
        if (!!targetCmp.up(sourceCmp)) {
            return false;
        }
        cursor = info.cursor.current;
        prevSibling = sourceCmp.previousSibling();
        nextSibling = sourceCmp.nextSibling();
        if (targetCmp === prevSibling) {
            box = prevSibling.element.getBox();
            diff = (cursor.x - box.left) / box.width;
            if (diff > 0.5) {
                return false;
            }
        } else if (targetCmp === nextSibling) {
            box = nextSibling.element.getBox();
            diff = (cursor.x - box.left) / box.width;
            if (diff <= 0.5) {
                return false;
            }
        }
        return true;
    },
    onDragMove: function(info) {
        var me = this,
            ddManager = Ext.dd.Manager,
            targetCmp = ddManager.getTargetComp(info),
            isDragTarget = targetCmp.isDragColumn,
            sourceCmp = ddManager.getSourceComp(info),
            notHeader = !targetCmp.isHeaderContainer || !sourceCmp.isHeaderContainer,
            highlight, positionCls;
        if (notHeader || targetCmp === sourceCmp || isDragTarget || targetCmp.getParent() === me.view) {
            if (this.ddEl) {
                this.removeDropMarker();
            }
            return;
        }
        highlight = ddManager.getPosition(info, targetCmp, 'x');
        positionCls = me.dropMarkerCls + '-' + highlight;
        if (targetCmp.hasCls(positionCls)) {
            return;
        }
        if (this.ddEl) {
            this.removeDropMarker();
        }
        if (me.isValidDrag(targetCmp, sourceCmp)) {
            me.ddEl = targetCmp;
            me.addDropMarker(targetCmp, [
                me.dropIndicator,
                positionCls
            ]);
        }
    },
    trackHeaderMove: function(header, headerCt) {
        var parentCt;
        if (!header || header === headerCt || header.innerItems.length) {
            return;
        }
        parentCt = header.getParent();
        parentCt.remove(header);
        this.trackHeaderMove(parentCt, headerCt);
    },
    onDrop: function(info) {
        var me = this,
            dropMethod = 'insertBefore',
            ddManager, targetCmp, headerCt, sourceCmp, dropAt, position, relativeToItem, fromCtRoot, fromIdx, sourceCmpParent;
        if (!me.ddEl) {
            return;
        }
        ddManager = Ext.dd.Manager;
        targetCmp = ddManager.getTargetComp(info);
        headerCt = targetCmp.getParent() || targetCmp.getRootHeaderCt();
        sourceCmp = ddManager.getSourceComp(info);
        fromCtRoot = sourceCmp.getRootHeaderCt();
        fromIdx = fromCtRoot.indexOf(sourceCmp);
        dropAt = headerCt.indexOf(targetCmp);
        position = ddManager.getPosition(info, targetCmp, 'x');
        sourceCmpParent = sourceCmp.getParent();
        me.removeDropMarker();
        if (dropAt === -1) {
            return;
        }
        if (position === 'after') {
            relativeToItem = headerCt.getAt(dropAt + 1);
            if (!relativeToItem) {
                dropMethod = 'insertAfter';
                relativeToItem = targetCmp;
            }
        } else {
            relativeToItem = headerCt.getAt(dropAt);
        }
        headerCt[dropMethod](sourceCmp, (relativeToItem || null));
        me.trackHeaderMove(sourceCmpParent, fromCtRoot);
        fromCtRoot.fireEvent('move', fromCtRoot, sourceCmp, dropAt, fromIdx);
    }
});

Ext.define('Ext.grid.PagingToolbar', {
    extend: Ext.Toolbar,
    xtype: 'pagingtoolbar',
    classCls: Ext.baseCSSPrefix + 'pagingtoolbar',
    config: {
        prevButton: {
            xtype: 'button',
            iconCls: Ext.baseCSSPrefix + 'pagingtoolbar-prev'
        },
        nextButton: {
            xtype: 'button',
            iconCls: Ext.baseCSSPrefix + 'pagingtoolbar-next'
        },
        sliderField: {
            xtype: 'singlesliderfield',
            liveUpdate: true,
            value: 1,
            flex: 1,
            minValue: 1
        },
        summaryComponent: {
            xtype: 'component',
            cls: Ext.baseCSSPrefix + 'pagingtoolbar-summary'
        }
    },
    inheritUi: true,
    initialize: function() {
        var me = this;
        me.callParent();
        me.add([
            me.getPrevButton(),
            me.getSummaryComponent(),
            me.getSliderField(),
            me.getNextButton()
        ]);
    },
    applyPrevButton: function(prevButton, oldPrevButton) {
        return Ext.factory(prevButton, Ext.Button, oldPrevButton);
    },
    applyNextButton: function(nextButton, oldNextButton) {
        return Ext.factory(nextButton, Ext.Button, oldNextButton);
    },
    applySliderField: function(sliderField, oldSliderField) {
        return Ext.factory(sliderField, Ext.field.SingleSlider, oldSliderField);
    },
    applySummaryComponent: function(summaryComponent, oldSummaryComponent) {
        return Ext.factory(summaryComponent, Ext.Component, oldSummaryComponent);
    }
});

Ext.define('Ext.grid.SummaryRow', {
    extend: Ext.grid.Row,
    xtype: 'gridsummaryrow',
    isSummaryRow: true,
    config: {
        group: null
    },
    defaultCellUI: 'summary',
    classCls: Ext.baseCSSPrefix + 'summaryrow',
    element: {
        reference: 'element',
        children: [
            {
                reference: 'cellsElement',
                className: Ext.baseCSSPrefix + 'cells-el'
            },
            {
                reference: 'rightSpacer',
                className: Ext.baseCSSPrefix + 'cells-el-right-spacer'
            }
        ]
    },
    updateGroup: function() {
        this.syncSummary();
    },
    privates: {
        beginRefresh: function(context) {
            var me = this,
                group = me.getGroup();
            context = me.callParent([
                context
            ]);
            context.group = group;
            context.records = (group ? group.data : context.store.data).items;
            context.summary = true;
            return context;
        },
        syncSummary: function() {
            var me = this,
                owner = me.getGroup() || me.parent.store,
                record = owner.getSummaryRecord(),
                viewModel = me.getViewModel();
            if (record === me.getRecord()) {
                me.refresh();
            } else {
                me.setRecord(record);
                if (viewModel) {
                    viewModel.setData({
                        record: record
                    });
                }
            }
        }
    }
});

Ext.define('Ext.grid.cell.Boolean', {
    extend: Ext.grid.cell.Text,
    xtype: 'booleancell',
    isBooleanCell: true,
    config: {
        falseText: 'False',
        trueText: 'True',
        undefinedText: '\xa0'
    },
    updateColumn: function(column, oldColumn) {
        var text;
        this.callParent([
            column,
            oldColumn
        ]);
        if (column && column.isBooleanColumn) {
            text = column.getFalseText();
            if (text !== null) {
                this.setFalseText(text);
            }
            text = column.getTrueText();
            if (text !== null) {
                this.setTrueText(text);
            }
            text = column.getUndefinedText();
            if (text !== null) {
                this.setUndefinedText(text);
            }
        }
    },
    updateFalseText: function() {
        if (!this.isConfiguring) {
            this.writeValue();
        }
    },
    updateTrueText: function() {
        if (!this.isConfiguring) {
            this.writeValue();
        }
    },
    updateUndefinedText: function() {
        if (!this.isConfiguring) {
            this.writeValue();
        }
    },
    formatValue: function(value) {
        var me = this;
        if (value === undefined) {
            value = me.getUndefinedText();
        } else if (!value || value === 'false') {
            value = me.getFalseText();
        } else {
            value = me.getTrueText();
        }
        return value;
    }
});

Ext.define('Ext.grid.cell.Expander', {
    extend: Ext.grid.cell.Base,
    xtype: 'expandercell',
    isExpanderCell: true,
    config: {
        collapsed: true
    },
    align: 'center',
    classCls: Ext.baseCSSPrefix + 'expandercell',
    expandedCls: Ext.baseCSSPrefix + 'expanded',
    innerTemplate: [
        {
            reference: 'iconElement',
            cls: Ext.baseCSSPrefix + 'icon-el ' + Ext.baseCSSPrefix + 'font-icon'
        }
    ],
    updateCollapsed: function(collapsed) {
        this.element.toggleCls(this.expandedCls, !collapsed);
    }
});

Ext.define('Ext.grid.cell.Widget', {
    extend: Ext.grid.cell.Base,
    xtype: 'widgetcell',
    isWidgetCell: true,
    config: {
        forceWidth: false,
        widget: null
    },
    align: 'center',
    classCls: Ext.baseCSSPrefix + 'widgetcell',
    selectable: false,
    getRefItems: function(deep) {
        var result = [],
            widget = this.getWidget();
        if (widget) {
            result.push(widget);
            if (deep && widget.getRefItems) {
                result.push.apply(result, widget.getRefItems(deep));
            }
        }
        return result;
    },
    setValue: function(value) {
        if (value && typeof value === 'object') {
            this._value = value;
            this.updateValue(value);
        } else {
            if (value === undefined) {
                value = null;
            }
            this.callParent([
                value
            ]);
        }
        return this;
    },
    updateValue: function(value) {
        var me = this,
            widget = me.getWidget(),
            defaultBindCfg = me.defaultBindCfg;
        if (defaultBindCfg && widget) {
            widget[defaultBindCfg.names.set](value);
        }
    },
    applyWidget: function(widget) {
        var me = this;
        if (widget) {
            widget = Ext.apply({
                ownerCmp: me
            }, widget);
            widget = Ext.create(widget);
        }
        return widget;
    },
    updateWidget: function(widget, oldWidget) {
        var me = this,
            defaultBindCfg;
        if (oldWidget) {
            me.widgetChangeListener = Ext.destroy(me.widgetChangeListener);
            oldWidget.measurer = null;
            oldWidget.destroy();
        }
        if (widget) {
            me.bodyElement.setHtml('');
            me.bodyElement.appendChild(widget.element);
            if (me.getForceWidth()) {
                me.setWidgetWidth(me.getWidth());
            }
            defaultBindCfg = widget.defaultBindProperty;
            defaultBindCfg = widget.self.getConfigurator().configs[defaultBindCfg];
            me.defaultBindCfg = defaultBindCfg || null;
            if (!defaultBindCfg || !widget[defaultBindCfg.names.get] || !widget[defaultBindCfg.names.set]) {
                Ext.raise('Invalid config "' + widget.defaultBindProperty + '" for ' + widget.$className);
            }
            if (me.dataIndex) {
                me.widgetChangeListener = widget.on({
                    change: 'onWidgetChange',
                    scope: me
                });
            }
        }
    },
    onWidgetChange: function(widget) {
        var me = this,
            record, defaultBindCfg, dataIndex, value;
        if (!me.refreshContext) {
            record = me.getRecord();
            defaultBindCfg = me.defaultBindCfg;
            dataIndex = me.dataIndex;
            if (defaultBindCfg) {
                value = widget[defaultBindCfg.names.get]();
                me.setValue(value);
                if (record && !record.isSummaryRecord && dataIndex) {
                    record.set(dataIndex, value);
                }
            }
        }
    },
    updateWidth: function(width, oldWidth) {
        this.callParent([
            width,
            oldWidth
        ]);
        if (this.getForceWidth()) {
            this.setWidgetWidth(width);
        }
    },
    onRender: function() {
        var me = this;
        if (me.getForceWidth()) {
            me.setWidgetWidth(me.getWidth());
        }
    },
    doDestroy: function() {
        this.setWidget(null);
        this.callParent();
    },
    privates: {
        setWidgetWidth: function(width) {
            var me = this,
                el = me.bodyElement,
                widget, column, leftPad, rightPad;
            if (!me.rendered) {
                return;
            }
            widget = me.getWidget();
            if (widget) {
                column = me.getColumn();
                leftPad = parseInt(column.getCachedStyle(el, 'padding-left'), 10) || 0;
                rightPad = parseInt(column.getCachedStyle(el, 'padding-right'), 10) || 0;
                widget.measurer = column;
                widget.setWidth(width - leftPad - rightPad);
            }
        }
    }
});

Ext.define('Ext.grid.column.Boolean', {
    extend: Ext.grid.column.Column,
    xtype: 'booleancolumn',
    isBooleanColumn: true,
    config: {
        trueText: null,
        falseText: null,
        undefinedText: null,
        defaultEditor: {
            xtype: 'checkboxfield'
        },
        cell: {
            xtype: 'booleancell'
        }
    }
});

Ext.define('Ext.grid.column.Drag', {
    extend: Ext.grid.column.Column,
    xtype: 'dragcolumn',
    classCls: Ext.baseCSSPrefix + 'drag-column',
    cell: {
        bodyCls: Ext.baseCSSPrefix + 'row-drag-indicator'
    },
    menu: null,
    sortable: false,
    draggable: false,
    resizable: false,
    hideable: false,
    ignore: true,
    width: 'auto',
    minWidth: 30,
    ignoreExport: true,
    text: '',
    isDragColumn: true,
    onViewColumnAdd: function(grid, column, index) {
        if (!index && !column.isDragColumn) {
            grid.insertColumn(0, this);
        }
    },
    onColumnMoved: function(grid, column, fromIndex, toIndex) {
        this.onViewColumnAdd(grid, column, toIndex);
    },
    updateGrid: function(grid, oldGrid) {
        var listeners = {
                scope: this,
                columnadd: 'onViewColumnAdd',
                columnmove: 'onColumnMoved'
            };
        if (this.isDestructing()) {
            return;
        }
        if (oldGrid) {
            oldGrid.un(listeners);
        }
        if (grid) {
            grid.on(listeners);
        }
    }
});

Ext.define('Ext.grid.column.Text', {
    extend: Ext.grid.column.Column,
    xtype: 'textcolumn',
    cell: {
        xtype: 'textcell'
    }
});

Ext.define('Ext.grid.filters.menu.Base', {
    extend: Ext.menu.CheckItem,
    isFilterMenuItem: true,
    mixins: [
        Ext.mixin.Bufferable
    ],
    text: 'Filter',
    menu: {
        indented: false
    },
    weight: -70,
    bufferableMethods: {
        onInputChange: 300
    },
    syncFilter: function() {
        var me = this,
            dataIndex = me.column.getDataIndex(),
            query = me.plugin.getQuery(),
            filters = query.getFilters(),
            items = me.getMenu().getItems().items,
            f, i, k, item, value;
        for (i = items.length; i-- > 0; ) {
            item = items[i];
            if (item.operator) {
                value = null;
                for (k = dataIndex && filters && filters.length; k-- > 0; ) {
                    f = filters[k];
                    if (f.property === dataIndex && f.operator === item.operator) {
                        value = f.value;
                        break;
                    }
                }
                item.setValue(value);
            }
        }
    },
    syncQuery: function() {
        var me = this,
            dataIndex = me.column.getDataIndex(),
            plugin = me.plugin,
            query = plugin.getQuery(),
            added = 0,
            removed = 0,
            filters, i, item, items, value;
        if (dataIndex) {
            filters = Ext.clone(query.getFilters());
            items = me.getMenu().getItems().items;
            for (i = filters && filters.length; i-- > 0; ) {
                if (filters[i].property === dataIndex) {
                    filters.splice(i, 1);
                    ++removed;
                }
            }
            if (me.getChecked()) {
                for (i = items.length; i-- > 0; ) {
                    item = items[i];
                    if (item.operator) {
                        value = item.getValue();
                        if (value !== null && value !== '') {
                            ++added;
                            if (Ext.isDate(value)) {
                                value = Ext.Date.format(value, 'C');
                            }
                            (filters || (filters = [])).push({
                                property: dataIndex,
                                operator: item.operator,
                                value: value
                            });
                        }
                    }
                }
            }
            if (!added) {
                me.setChecked(false);
            }
            if (added || removed) {
                plugin.setActiveFilter(filters);
            }
        }
    },
    privates: {
        doOnInputChange: function() {
            this.setChecked(true);
            this.syncQuery();
        }
    }
});

Ext.define('Ext.grid.filters.menu.Boolean', {
    extend: Ext.grid.filters.menu.Base,
    alias: 'gridFilters.boolean',
    menu: {
        defaults: {
            name: 'boolfilter',
            group: 'value',
            xtype: 'menuradioitem',
            operator: '==',
            checkHandler: 'up.onInputChange'
        },
        items: {
            yes: {
                value: true,
                text: 'True',
                weight: 10
            },
            no: {
                value: false,
                text: 'False',
                weight: 20
            }
        }
    },
    syncFilter: function() {
        var me = this,
            column = me.column,
            dataIndex = column.getDataIndex(),
            query = me.plugin.getQuery(),
            filters = query.getFilters(),
            items = me.getMenu().getItems().items,
            f, i, k, item, value;
        for (i = items.length; i-- > 0; ) {
            item = items[i];
            if (item.operator) {
                value = null;
                for (k = dataIndex && filters && filters.length; k-- > 0; ) {
                    f = filters[k];
                    if (f.property === dataIndex && f.operator === item.operator) {
                        if (item.getChecked) {
                            if (f.value === item.getValue()) {
                                value = f.value;
                                break;
                            }
                        } else {
                            value = f.value;
                            break;
                        }
                    }
                }
                if (item.operator === '==' && item.getChecked) {
                    if (item.getValue() === value) {
                        item.setChecked(true);
                    } else {
                        item.setChecked(false);
                    }
                } else {
                    item.setValue(value);
                }
            }
        }
    },
    syncQuery: function() {
        var me = this,
            dataIndex = me.column.getDataIndex(),
            plugin = me.plugin,
            query = plugin.getQuery(),
            added = 0,
            removed = 0,
            filters, i, item, items, value;
        if (dataIndex) {
            filters = Ext.clone(query.getFilters());
            items = me.getMenu().getItems().items;
            for (i = filters && filters.length; i-- > 0; ) {
                if (filters[i].property === dataIndex) {
                    filters.splice(i, 1);
                    ++removed;
                }
            }
            if (me.getChecked()) {
                for (i = items.length; i-- > 0; ) {
                    item = items[i];
                    if (item.operator) {
                        if (item && item.getChecked) {
                            if (item.getChecked() && (item.getValue() === true || item.getValue() === false)) {
                                value = item.getValue();
                            } else {
                                value = null;
                            }
                        } else {
                            value = item.getValue();
                            me.setChecked(true);
                        }
                        if (value !== null && value !== '') {
                            ++added;
                            (filters || (filters = [])).push({
                                property: dataIndex,
                                operator: item.operator,
                                value: value
                            });
                        }
                    }
                }
            }
            if (!added) {
                me.setChecked(false);
            }
            if (added || removed) {
                plugin.setActiveFilter(filters);
            }
        }
    }
});

Ext.define('Ext.grid.filters.menu.Date', {
    extend: Ext.grid.filters.menu.Base,
    alias: 'gridFilters.date',
    menu: {
        items: {
            lt: {
                xtype: 'datefield',
                label: 'Before',
                placeholder: 'Before...',
                operator: '<',
                weight: 10,
                listeners: {
                    change: 'up.onInputChange'
                }
            },
            gt: {
                xtype: 'datefield',
                label: 'After',
                placeholder: 'After...',
                operator: '>',
                weight: 20,
                listeners: {
                    change: 'up.onInputChange'
                }
            },
            eq: {
                xtype: 'datefield',
                label: 'On',
                placeholder: 'On...',
                operator: '=',
                separator: true,
                weight: 30,
                listeners: {
                    change: 'up.onInputChange'
                }
            }
        }
    },
    syncFilter: function() {
        var me = this,
            column = me.column,
            dataIndex = column.getDataIndex(),
            query = me.plugin.getQuery(),
            filters = query.getFilters(),
            items = me.getMenu().getItems().items,
            f, i, k, item, value;
        for (i = items.length; i-- > 0; ) {
            item = items[i];
            if (item.operator) {
                value = null;
                for (k = dataIndex && filters && filters.length; k-- > 0; ) {
                    f = filters[k];
                    if (f.operator === '==' && !item.getChecked && !(typeof f.value === 'boolean')) {
                        f.operator = '=';
                    }
                    if (f.property === dataIndex && f.operator === item.operator) {
                        value = f.value;
                        break;
                    }
                }
                if (column.columnFilterTypes[column.xtype] === 'date') {
                    value = value && Ext.Date.parse(value);
                }
                item.setValue(value);
            }
        }
    }
});

Ext.define('Ext.grid.filters.menu.Number', {
    extend: Ext.grid.filters.menu.Base,
    alias: 'gridFilters.number',
    menu: {
        items: {
            lt: {
                xtype: 'numberfield',
                label: 'Less than',
                placeholder: 'Less than...',
                floatedPickerAlign: 'tl-tr?',
                operator: '<',
                weight: 10,
                listeners: {
                    change: 'up.onInputChange'
                }
            },
            gt: {
                xtype: 'numberfield',
                label: 'Greater than',
                placeholder: 'Greater than...',
                floatedPickerAlign: 'tl-tr?',
                operator: '>',
                weight: 20,
                listeners: {
                    change: 'up.onInputChange'
                }
            },
            eq: {
                xtype: 'numberfield',
                label: 'Equal to',
                placeholder: 'Equal to...',
                floatedPickerAlign: 'tl-tr?',
                operator: '=',
                separator: true,
                weight: 30,
                listeners: {
                    change: 'up.onInputChange'
                }
            }
        }
    },
    syncFilter: function() {
        var me = this,
            dataIndex = me.column.getDataIndex(),
            query = me.plugin.getQuery(),
            filters = query.getFilters(),
            items = me.getMenu().getItems().items,
            f, i, k, item, value;
        for (i = items.length; i-- > 0; ) {
            item = items[i];
            if (item.operator) {
                value = null;
                for (k = dataIndex && filters && filters.length; k-- > 0; ) {
                    f = filters[k];
                    if (f.operator === '==' && !item.getChecked && !(typeof f.value === 'boolean')) {
                        f.operator = '=';
                    }
                    if (f.property === dataIndex && f.operator === item.operator) {
                        value = f.value;
                        break;
                    }
                }
                item.setValue(value);
            }
        }
    }
});

Ext.define('Ext.grid.filters.menu.String', {
    extend: Ext.grid.filters.menu.Base,
    alias: 'gridFilters.string',
    menu: {
        items: {
            like: {
                xtype: 'textfield',
                placeholder: 'Like...',
                operator: 'like',
                listeners: {
                    change: 'up.onInputChange'
                }
            }
        }
    }
});

Ext.define('Ext.grid.filters.Plugin', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.gridfilters',
    mixins: [
        Ext.state.Stateful,
        Ext.mixin.StoreWatcher
    ],
    config: {
        activeFilter: null,
        query: {
            type: 'default',
            format: 'filters'
        }
    },
    stateful: [
        'activeFilter'
    ],
    init: function(grid) {
        this.setOwner(grid);
        grid.on({
            beforeshowcolumnmenu: 'onBeforeShowColumnMenu',
            scope: this
        });
    },
    destroy: function() {
        this.setOwner(null);
        this.callParent();
    },
    updateActiveFilter: function(filter) {
        var query = this.getQuery();
        if (Ext.isString(filter)) {
            query.setSource(filter);
        } else {
            query.setFilters(filter);
        }
    },
    applyQuery: function(config, query) {
        return Ext.Factory.query.update(query, config);
    },
    updateQuery: function(query) {
        if (query) {
            var me = this,
                fn = query.compile;
            query.compile = function() {
                fn.call(query);
                me.queryModified(query);
            };
        }
    },
    updateStore: function(store, oldStore) {
        var me = this,
            query = me.getQuery();
        me.mixins.storewatcher.updateStore.call(me, store, oldStore);
        if (oldStore && !(oldStore.destroying || oldStore.destroyed)) {
            oldStore.getFilters().remove(query);
        }
        if (store) {
            store.getFilters().add(query);
        }
    },
    onSetFilter: function(menuItem) {
        this.setActiveFilter(menuItem.rec.data.query);
    },
    privates: {
        onBeforeShowColumnMenu: function(grid, column, menu) {
            var me = this,
                filterMenuItem = menu.getComponent('filter'),
                menuConfig;
            if (!filterMenuItem) {
                menuConfig = column.createFilter({
                    itemId: 'filter',
                    plugin: me,
                    column: column
                });
                filterMenuItem = menuConfig && menu.add(Ext.Factory.gridFilters(menuConfig));
                if (filterMenuItem) {
                    filterMenuItem.setCheckHandler(me.onFilterItemCheckChange.bind(me));
                }
            }
            if (filterMenuItem) {
                filterMenuItem.syncFilter();
            }
        },
        onFilterItemCheckChange: function(item) {
            item.syncQuery();
        },
        queryModified: function() {
            var filters = this.cmp.getStore();
            filters = filters && filters.getFilters();
            if (filters) {
                filters.beginUpdate();
                ++filters.generation;
                filters.endUpdate();
            }
        }
    }
});

Ext.define('Ext.layout.Fit', {
    extend: Ext.layout.Auto,
    alias: 'layout.fit',
    isFit: true,
    cls: Ext.baseCSSPrefix + 'layout-fit',
    itemCls: Ext.baseCSSPrefix + 'layout-fit-item'
});

Ext.define('Ext.grid.locked.Grid', {
    extend: Ext.Panel,
    xtype: 'lockedgrid',
    alternateClassName: 'Ext.grid.LockedGrid',
    isLockedGrid: true,
    classCls: Ext.baseCSSPrefix + 'lockedgrid',
    config: {
        columnMenu: {
            items: {
                region: {
                    text: 'Locked',
                    iconCls: 'fi-lock',
                    menu: {}
                }
            }
        },
        columns: null,
        defaultLockedRegion: 'left',
        gridDefaults: null,
        hideHeaders: false,
        itemConfig: {},
        leftRegionDefaults: {
            locked: true,
            menuItem: {
                iconCls: 'fi-chevron-left'
            }
        },
        regions: {
            left: {
                menuItem: {
                    text: 'Locked (Left)'
                },
                weight: -10
            },
            center: {
                flex: 1,
                menuItem: {
                    text: 'Unlocked',
                    iconCls: 'fi-unlock'
                },
                weight: 0
            },
            right: {
                menuItem: {
                    text: 'Locked (Right)'
                },
                weight: 10
            }
        },
        rightRegionDefaults: {
            locked: true,
            menuItem: {
                iconCls: 'fi-chevron-right'
            }
        },
        store: null,
        variableHeights: false,
        enableColumnMove: true,
        grouped: true
    },
    weighted: true,
    layout: {
        type: 'hbox',
        align: 'stretch'
    },
    onRender: function() {
        this.callParent();
        this.setupHeaderSync();
        this.reconfigure();
    },
    doDestroy: function() {
        Ext.undefer(this.partnerTimer);
        this.callParent();
    },
    addColumn: function(columns) {
        var me = this,
            map = me.processColumns(columns),
            isArray = Array.isArray(columns),
            ret = isArray ? [] : null,
            grids = me.gridItems,
            len = grids.length,
            v, i, grid, toAdd;
        for (i = 0; i < len; ++i) {
            grid = grids[i];
            toAdd = map[grid.regionKey];
            if (toAdd) {
                v = grid.addColumn(toAdd);
                if (isArray) {
                    Ext.Array.push(ret, v);
                } else {
                    ret = v[0];
                }
            }
        }
        if (me.getVariableHeights()) {
            me.doRefresh();
        }
        return ret;
    },
    getHorizontalOverflow: function() {
        var grids = this.visibleGrids,
            n = grids && grids.length,
            i;
        for (i = 0; i < n; ++i) {
            if (grids[i].getHorizontalOverflow()) {
                return true;
            }
        }
        return false;
    },
    getRegion: function(key) {
        return this.regionMap[key] || null;
    },
    getVerticalOverflow: function() {
        var grids = this.visibleGrids,
            n = grids && grids.length;
        return n && grids[n - 1].getVerticalOverflow();
    },
    insertColumnBefore: function(column, before) {
        var ret;
        if (before === null) {
            ret = this.gridMap.center.addColumn(column);
        } else {
            ret = before.getParent().insertBefore(column, before);
        }
        if (this.getVariableHeights()) {
            this.doRefresh();
        }
        return ret;
    },
    removeColumn: function(column) {
        var ret = column.getGrid().removeColumn(column);
        if (this.getVariableHeights()) {
            this.doRefresh();
        }
        return ret;
    },
    createLocation: function(location) {
        var grid;
        if (location.isGridLocation && location.column) {
            grid = location.column.getGrid();
            if (grid.getHidden()) {
                grid = null;
                location = location.record;
            }
        }
        if (!grid) {
            grid = this.regionMap.center.getGrid();
        }
        return grid.createLocation(location);
    },
    setLocation: function(location, options) {
        var grid;
        if (location.isGridLocation && location.column) {
            grid = location.column.getGrid();
            if (grid.getHidden()) {
                grid = null;
                location = location.record;
            }
        }
        if (!grid) {
            grid = this.regionMap.center.getGrid();
        }
        grid.setLocation(location, options);
    },
    updateColumns: function(columns) {
        var me = this,
            grids = me.gridItems,
            map, len, i, grid;
        if (me.isConfiguring) {
            return;
        }
        map = me.processColumns(columns);
        ++me.bulkColumnChange;
        for (i = 0 , len = grids.length; i < len; ++i) {
            grid = grids[i];
            grid.setColumns(map[grid.regionKey] || []);
        }
        me.doRefresh();
        --me.bulkColumnChange;
    },
    updateGrouped: function(value) {
        this.relayConfig('grouped', value);
    },
    updateHideHeaders: function(hideHeaders) {
        var me = this;
        me.headerSync = Ext.destroy(me.headerSync);
        me.relayConfig('hideHeaders', hideHeaders);
        me.setupHeaderSync();
    },
    updateEnableColumnMove: function(enabled) {
        var me = this,
            gridItems, b;
        if (me.isConfiguring) {
            return;
        }
        gridItems = me.gridItems;
        for (b = 0; b < gridItems.length; b++) {
            gridItems[b].setEnableColumnMove(enabled);
        }
    },
    updateItemConfig: function(itemConfig) {
        this.relayConfig('itemConfig', itemConfig);
    },
    updateMaxHeight: function(maxHeight) {
        this.relayConfig('maxHeight', maxHeight);
    },
    updateRegions: function(regions) {
        var me = this,
            regionMap = me.regionMap,
            gridDefaults = me.getGridDefaults(),
            variableHeights = me.getVariableHeights(),
            enableColumnMove = me.getEnableColumnMove(),
            key, region, colMap, grid, gridMap, prev, scroller, len, i, defaultPartner, regionItems, gridItems;
        if (regionMap) {
            for (key in regionMap) {
                me.remove(regionMap[key]);
            }
        }
        me.regionMap = regionMap = {};
        me.gridMap = gridMap = {};
        colMap = me.processColumns(me.getColumns());
        for (key in regions) {
            region = regions[key];
            if (region) {
                region = me.createRegion(key, regions[key], colMap[key], gridDefaults);
                region = me.add(region);
                grid = region.getGrid();
                grid.isDefaultPartner = key === me.unlockedKey;
                grid.setEnableColumnMove(enableColumnMove);
                if (variableHeights) {
                    grid.partnerManager = me;
                    if (grid.isDefaultPartner) {
                        me.defaultPartner = defaultPartner = grid;
                    }
                }
                region.on({
                    scope: me,
                    collapse: 'onRegionCollapse',
                    expand: 'onRegionExpand',
                    hide: 'onRegionHide',
                    show: 'onRegionShow'
                });
                regionMap[key] = region;
                gridMap[key] = grid;
                scroller = grid.getScrollable();
                if (scroller) {
                    if (prev) {
                        prev.addPartner(scroller, 'y');
                    }
                    prev = scroller;
                }
                me.setupGrid(grid);
            }
        }
        me.regionItems = regionItems = me.query('>[isLockedGridRegion]');
        me.gridItems = gridItems = [];
        for (i = 0 , len = regionItems.length; i < len; ++i) {
            grid = regionItems[i].getGrid();
            gridItems.push(grid);
            if (defaultPartner && grid !== defaultPartner) {
                grid.renderInfo = defaultPartner.renderInfo;
            }
        }
        me.setupHeaderSync();
    },
    applyStore: function(store) {
        return store ? Ext.data.StoreManager.lookup(store) : null;
    },
    updateStore: function(store) {
        this.store = store;
        this.relayConfig('store', store);
    },
    updateVariableHeights: function(variableHeights) {
        this.relayConfig('variableHeights', variableHeights);
    },
    registerActionable: function(actionable) {
        var me = this,
            actionables = me.actionables || (me.actionables = []),
            gridItems = me.gridItems,
            i;
        if (!Ext.Array.contains(actionables, actionable)) {
            actionables.push(actionable);
            if (gridItems) {
                for (i = gridItems.length; i-- > 0; ) {
                    gridItems[i].registerActionable(actionable);
                }
            }
        }
    },
    unregisterActionable: function(actionable) {
        var actionables = this.actionables,
            gridItems = this.gridItems,
            i;
        if (actionables) {
            Ext.Array.remove(actionables, actionable);
            if (gridItems) {
                for (i = gridItems.length; i-- > 0; ) {
                    gridItems[i].registerActionable(actionable);
                }
            }
        }
    },
    statics: {
        relayGridMethod: function(name, collection, key, defaultResult) {
            collection = collection || 'visibleGrids';
            key = key || 0;
            if (defaultResult == null) {
                defaultResult = null;
            }
            this.prototype[name] = function() {
                var grid = this[collection],
                    ret = defaultResult;
                grid = grid && grid[key];
                if (grid) {
                    if (grid.isLockedGridRegion) {
                        grid = grid.getGrid();
                    }
                    ret = grid[name].apply(grid, arguments);
                }
                return ret;
            };
        },
        relayGridMethods: function(descr) {
            var simple = [],
                name, options;
            for (name in descr) {
                options = descr[name];
                if (options === true) {
                    options = simple;
                    simple[0] = name;
                } else {
                    options = options.slice();
                    options.unshift(name);
                }
                this.relayGridMethod.apply(this, options);
            }
        }
    },
    privates: {
        bulkColumnChange: 0,
        partnerOffset: 200,
        itemConfiguring: false,
        lastPartnerRequest: 0,
        unlockedKey: 'center',
        claimActivePartner: function(partner) {
            var me = this,
                now = Date.now(),
                active = me.activePartner;
            me.partnerTimer = Ext.undefer(me.partnerTimer);
            if (!active || (now - me.lastPartnerRequest > me.partnerOffset)) {
                me.activePartner = partner;
                me.lastPartnerRequest = now;
                me.setActivePartner(partner);
            }
        },
        configureHeaderHeights: function() {
            var headerSync = this.headerSync;
            if (headerSync) {
                headerSync.sync();
            }
        },
        configureItems: function() {
            var me = this,
                gridItems = me.gridItems,
                regionItems = me.regionItems,
                i, found, grid, hide, region;
            me.itemConfiguring = true;
            for (i = gridItems.length - 1; i >= 0; --i) {
                grid = gridItems[i];
                region = regionItems[i];
                me.setRegionVisibility(region);
                hide = true;
                if (!found || !grid.getVerticalOverflow()) {
                    hide = false;
                    found = !region.hasHiddenContent();
                }
                grid.setHideScrollbar(hide);
            }
            me.itemConfiguring = false;
        },
        configurePartners: function() {
            var me = this,
                gridItems = this.gridItems,
                len = gridItems.length,
                visibleGrids, i, grid;
            visibleGrids = gridItems.filter(function(item) {
                return me.isRegionVisible(item.region);
            });
            me.visibleGrids = visibleGrids;
            for (i = 0; i < len; ++i) {
                grid = gridItems[i];
                grid.allPartners = visibleGrids;
                grid.partners = visibleGrids.filter(function(item) {
                    return item !== grid;
                });
            }
        },
        createRegion: function(key, cfg, columns, gridDefaults) {
            var me = this,
                weight = cfg.weight,
                defaults;
            me.fireEvent('createregion', me, columns);
            if (weight !== 0) {
                defaults = weight < 0 ? me.getLeftRegionDefaults() : me.getRightRegionDefaults();
            }
            return Ext.merge({
                xtype: 'lockedgridregion',
                regionKey: key,
                lockedGrid: me,
                grid: Ext.apply({
                    regionKey: key,
                    columnMenu: me.getColumnMenu(),
                    columns: columns,
                    hideHeaders: me.getHideHeaders(),
                    grouped: me.getGrouped(),
                    itemConfig: me.getItemConfig(),
                    store: me.getStore(),
                    variableHeights: me.getVariableHeights()
                }, gridDefaults)
            }, defaults, cfg);
        },
        doHorizontalScrollCheck: function() {
            var grids = this.gridItems,
                len = grids.length,
                grid, scroller, i;
            for (i = 0; i < len; ++i) {
                grid = grids[i];
                scroller = grid.getScrollable();
                if (this.isRegionVisible(grid.region) && scroller) {
                    scroller.setX(grid.getHorizontalOverflow() ? 'scroll' : true);
                }
            }
        },
        doRefresh: function() {
            this.reconfigure();
            this.refreshGrids();
            this.doHorizontalScrollCheck();
            this.doVerticalScrollCheck();
        },
        doReleaseActivePartner: function() {
            var me = this;
            if (!me.destroyed) {
                me.lastPartnerRequest = 0;
                me.activePartner = null;
                me.setActivePartner(me.defaultPartner);
            }
        },
        doVerticalScrollCheck: function() {
            var grids = this.gridItems,
                len = grids.length,
                grid, scroller, region, i;
            for (i = 0; i < len; ++i) {
                grid = grids[i];
                scroller = grid.getScrollable();
                region = grid.region;
                if (region && this.isRegionVisible(region) && scroller) {
                    if (grid.getVerticalOverflow()) {
                        this.setGridScrollers(region, region.isHidden());
                    } else {
                        this.setGridScrollers(false);
                    }
                }
            }
        },
        handleChangeRegion: function(region, column) {
            var me = this,
                grid = region.getGrid(),
                gridItems = me.gridItems,
                newIdx = gridItems.indexOf(grid),
                oldIdx = gridItems.indexOf(column.getGrid());
            ++me.bulkColumnChange;
            if (newIdx < oldIdx) {
                grid.addColumn(column);
            } else {
                grid.insertColumn(0, column);
            }
            grid.syncRowsToHeight(true);
            --me.bulkColumnChange;
            me.doHorizontalScrollCheck();
            me.doVerticalScrollCheck();
        },
        handleRegionVisibilityChange: function(region, hiding) {
            var me = this;
            if (!me.itemConfiguring) {
                me.configurePartners();
                me.refreshGrids();
                me.setGridScrollers(region, hiding);
                me.configureHeaderHeights();
            }
        },
        isActivePartner: function(grid) {
            var active = this.activePartner;
            return active ? grid === active : grid.isDefaultPartner;
        },
        isHeaderVisible: function(header) {
            return this.isRegionVisible(header.getGrid().region);
        },
        isRegionVisible: function(region) {
            return !region.hasHiddenContent();
        },
        isLastVisibleRegion: function(region) {
            var regions = this.regionItems,
                index = regions.indexOf(region),
                other, i;
            for (i = regions.length - 1; i > index; --i) {
                other = regions[i];
                if (!other.hasHiddenContent()) {
                    return false;
                }
            }
            return true;
        },
        onBeforeShowColumnMenu: function(grid, column, menu) {
            var regions = this.regionItems,
                len = regions.length,
                current = grid.region,
                disabled = false,
                items, region, i;
            menu = menu.getComponent('region');
            if (menu) {
                menu = menu.getMenu();
                menu.removeAll();
                items = [];
                disabled = !!(grid.isDefaultPartner && grid.getVisibleColumns().length === 1);
                for (i = 0; i < len; ++i) {
                    region = regions[i];
                    items.push(Ext.applyIf({
                        disabled: disabled || region === current,
                        handler: this.handleChangeRegion.bind(this, region, column)
                    }, region.getMenuItem()));
                }
                menu.add(items);
            }
        },
        onColumnAdd: function(grid) {
            if (!this.setRegionVisibility(grid.region)) {
                this.refreshGrids();
            }
            this.configureHeaderHeights();
        },
        onColumnHide: function(grid) {
            if (!this.setRegionVisibility(grid.region)) {
                this.refreshGrids();
            }
            this.configureHeaderHeights();
        },
        onColumnRemove: function(grid, column) {
            var me = this;
            me.fireEvent('columnremove', grid, column);
            if (!me.setRegionVisibility(grid.region)) {
                me.refreshGrids();
            }
            me.configureHeaderHeights();
        },
        onColumnShow: function(grid) {
            if (!this.setRegionVisibility(grid.region)) {
                this.refreshGrids();
            }
            this.configureHeaderHeights();
        },
        onGridHorizontalOverflowChange: function() {
            if (!this.bulkColumnChange) {
                this.doHorizontalScrollCheck();
            }
        },
        onGridResize: function(grid) {
            grid.syncRowsToHeight(true);
        },
        onGridVerticalOverflowChange: function(grid, value) {
            var region = grid.region;
            if (value) {
                this.setGridScrollers(region, region.isHidden());
            } else {
                grid.setHideScrollbar(false);
            }
        },
        onRegionCollapse: function(region) {
            this.handleRegionVisibilityChange(region, true);
        },
        onRegionExpand: function(region) {
            this.handleRegionVisibilityChange(region, false);
        },
        onRegionHide: function(region) {
            this.handleRegionVisibilityChange(region, true);
        },
        onRegionShow: function(region) {
            this.handleRegionVisibilityChange(region, false);
        },
        getRegionKey: function(lockedValue) {
            var defaultLocked = this.getDefaultLockedRegion(),
                key;
            if (lockedValue) {
                key = lockedValue === true ? defaultLocked : lockedValue;
            } else {
                key = this.unlockedKey;
            }
            return key;
        },
        processColumns: function(columns) {
            var me = this,
                map = {},
                len, i, col, locked, key, arr;
            if (columns) {
                if (!Array.isArray(columns)) {
                    columns = [
                        columns
                    ];
                }
                for (i = 0 , len = columns.length; i < len; ++i) {
                    col = columns[i];
                    locked = col.locked || (col.getLocked && col.getLocked());
                    key = me.getRegionKey(locked);
                    arr = map[key];
                    if (!arr) {
                        map[key] = arr = [];
                    }
                    arr.push(col);
                }
            }
            return map;
        },
        reconfigure: function() {
            this.configureItems();
            this.configurePartners();
            this.configureHeaderHeights();
        },
        refreshGrids: function() {
            var visibleGrids = this.visibleGrids,
                len = visibleGrids.length,
                i;
            if (!this.rendered) {
                return;
            }
            for (i = 0; i < len; ++i) {
                visibleGrids[i].syncRowsToHeight(true);
            }
        },
        relayConfig: function(name, value) {
            var grids = this.gridItems,
                i, len, setter;
            if (grids && !this.isConfiguring) {
                setter = Ext.Config.get(name).names.set;
                for (i = 0 , len = grids.length; i < len; ++i) {
                    grids[i][setter](value);
                }
            }
        },
        releaseActivePartner: function(partner) {
            var me = this;
            if (me.activePartner === partner) {
                Ext.undefer(me.partnerTimer);
                me.partnerTimer = Ext.defer(me.doReleaseActivePartner, me.partnerOffset, me);
            }
        },
        setActivePartner: function(partner) {
            var visibleGrids = this.visibleGrids;
            Ext.Array.remove(visibleGrids, partner);
            visibleGrids.unshift(partner);
        },
        setGridScrollers: function(region, isHiding) {
            var gridItems = this.gridItems,
                len = gridItems.length,
                index, i, grid;
            if (this.isLastVisibleRegion(region)) {
                grid = region.getGrid();
                index = gridItems.indexOf(grid) - (isHiding ? 1 : 0);
                for (i = 0; i < len; ++i) {
                    gridItems[i].setHideScrollbar(grid.getVerticalOverflow() ? i < index : false);
                }
            }
        },
        setRegionVisibility: function(region) {
            var grid = region.getGrid(),
                hidden = !!region.getHidden();
            region.setHidden(grid.getVisibleColumns().length === 0);
            return hidden !== region.getHidden();
        },
        setupGrid: function(grid) {
            var actionables = this.actionables,
                i;
            if (actionables) {
                for (i = 0; i < actionables.length; ++i) {
                    grid.registerActionable(actionables[i]);
                }
            }
            grid.on({
                scope: this,
                beforeshowcolumnmenu: 'onBeforeShowColumnMenu',
                columnadd: 'onColumnAdd',
                columnhide: 'onColumnHide',
                columnremove: 'onColumnRemove',
                columnshow: 'onColumnShow',
                horizontaloverflowchange: 'onGridHorizontalOverflowChange',
                resize: 'onGridResize',
                verticaloverflowchange: 'onGridVerticalOverflowChange'
            });
        },
        setupHeaderSync: function() {
            var me = this,
                grids = me.gridItems,
                headers, i;
            if (!me.getHideHeaders() && !me.isConfiguring) {
                headers = [];
                for (i = 0; i < grids.length; ++i) {
                    headers.push(grids[i].getHeaderContainer());
                }
                Ext.destroy(me.headerSync);
                me.headerSync = new Ext.util.HeightSynchronizer(headers, me.isHeaderVisible.bind(me));
            }
        }
    }
}, function(LockedGrid) {
    LockedGrid.relayGridMethods({
        ensureVisible: true,
        gatherData: true,
        getSelections: true,
        mapToItem: true,
        mapToRecord: true,
        mapToRecordIndex: true
    });
});

Ext.define('Ext.grid.locked.Region', {
    extend: Ext.Panel,
    xtype: 'lockedgridregion',
    isLockedGridRegion: true,
    alternateClassName: 'Ext.grid.LockedGridRegion',
    classCls: Ext.baseCSSPrefix + 'lockedgridregion',
    autoSize: null,
    lockedGrid: null,
    config: {
        grid: {
            xtype: 'grid',
            manageHorizontalOverflow: false,
            reserveScrollbar: true,
            scrollable: {
                x: true,
                y: true
            }
        },
        locked: false,
        menuItem: {},
        menuLabel: '',
        regionKey: ''
    },
    border: true,
    layout: 'fit',
    onResize: function() {},
    applyMenuItem: function(menuItem) {
        var label = this.getMenuLabel();
        if (menuItem && label) {
            menuItem = Ext.applyIf({
                text: label
            }, menuItem);
        }
        return menuItem;
    },
    updateHidden: function(hidden, wasHidden) {
        var me = this,
            headerSync = me.lockedGrid.headerSync,
            navModel;
        me.callParent([
            hidden,
            wasHidden
        ]);
        if (hidden) {
            navModel = me.getGrid().getNavigationModel();
            if (navModel && navModel.getLocation()) {
                navModel.setLocation(null);
            }
        }
        if (headerSync) {
            headerSync.invalidateItems();
        }
    },
    applyGrid: function(grid) {
        if (grid) {
            grid = this.add(grid);
            grid.region = this;
        }
        return grid;
    },
    updateWeight: function(weight, oldWeight) {
        var me = this,
            map = me.sideClsMap;
        me.callParent([
            weight,
            oldWeight
        ]);
        if (oldWeight) {
            me.removeCls(map[Ext.Number.sign(oldWeight)]);
        }
        if (weight) {
            me.addCls(map[Ext.Number.sign(weight)]);
        }
    },
    privates: {
        sideClsMap: {
            '-1': Ext.baseCSSPrefix + 'lock-start',
            1: Ext.baseCSSPrefix + 'lock-end'
        }
    }
});

Ext.define('Ext.grid.plugin.CellEditing', {
    extend: Ext.plugin.Abstract,
    alias: [
        'plugin.gridcellediting',
        'plugin.cellediting'
    ],
    config: {
        grid: null,
        triggerEvent: 'doubletap',
        selectOnEdit: null
    },
    init: function(grid) {
        this.setGrid(grid);
        grid.setTouchAction({
            doubleTapZoom: false
        });
        grid.$cellEditing = true;
    },
    getEditor: function(location) {
        var column = location.column,
            fieldName = column.getDataIndex(),
            record = location.record,
            editable = column.getEditable(),
            editor, field;
        if (!(editor = editable !== false && column.getEditor(location.record)) && editable) {
            editor = Ext.create(column.getDefaultEditor());
        }
        if (editor) {
            if (!editor.isCellEditor) {
                editor = Ext.create({
                    xtype: 'celleditor',
                    field: editor,
                    plugin: this
                });
            }
            column.setEditor(editor);
            editor.editingPlugin = this;
            field = editor.getField();
            field.addUi('celleditor');
            field.setValidationField(record.getField(fieldName), record);
        }
        return editor;
    },
    getActiveEditor: function() {
        return this.activeEditor;
    },
    updateGrid: function(grid, oldGrid) {
        if (oldGrid) {
            oldGrid.unregisterActionable(this);
        }
        if (grid) {
            grid.registerActionable(this);
        }
    },
    activateCell: function(location) {
        var me = this,
            activeEditor = me.activeEditor,
            previousEditor = me.$previousEditor,
            editor, selModel, result;
        if (!location) {
            Ext.raise('A grid Location must be passed into CellEditing#activateCell');
        }
        if (activeEditor && activeEditor.$activeLocation.cell === location.cell) {
            return activeEditor.$activeLocation;
        } else {
            editor = me.getEditor(location);
            if (editor) {
                if (previousEditor) {
                    if (previousEditor.isCancelling) {
                        previousEditor.cancelEdit();
                    } else {
                        previousEditor.completeEdit();
                    }
                }
                result = editor.startEdit(location);
                if (editor.editing) {
                    if (me.getSelectOnEdit()) {
                        selModel = me.getGrid().getSelectable();
                        if (selModel.getCells()) {
                            selModel.selectCells(location, location);
                        } else if (selModel.getRows()) {
                            selModel.select(location.record);
                        }
                    }
                    me.$previousEditor = editor;
                    return result;
                } else {
                    editor.onEditComplete(false, true);
                }
            }
        }
    },
    startEdit: function(record, column) {
        this.activateCell(new Ext.grid.Location(this.getGrid(), {
            record: record,
            column: column
        }));
    },
    destroy: function() {
        var grid = this.getGrid();
        if (grid) {
            grid.$cellEditing = false;
        }
        this.$previousEditor = null;
        this.callParent();
    }
});

Ext.define('Ext.grid.plugin.Clipboard', {
    extend: Ext.plugin.AbstractClipboard,
    alias: 'plugin.clipboard',
    formats: {
        cell: {
            get: 'getCells'
        },
        html: {
            get: 'getCellData'
        },
        raw: {
            get: 'getCellData',
            put: 'putCellData'
        }
    },
    gridListeners: {
        initialize: 'onCmpReady'
    },
    getCellData: function(format, erase) {
        var cmp = this.getCmp(),
            selectable = cmp.getSelectable(),
            selection = selectable && selectable.getSelection(),
            ret = [],
            isRaw = format === 'raw',
            isText = format === 'text',
            data, dataIndex, lastRecord, column, record, row;
        if (selection) {
            selection.eachCell(function(location, colIdx, rowIdx) {
                column = location.column;
                record = location.record;
                if (column.getIgnoreExport()) {
                    return;
                }
                if (lastRecord !== record) {
                    lastRecord = record;
                    ret.push(row = []);
                }
                dataIndex = column.getDataIndex();
                data = record.data[dataIndex];
                if (!isRaw) {
                    data = column.printValue(data);
                    if (isText) {
                        data = Ext.util.Format.stripTags(data);
                    }
                }
                row.push(data);
                if (erase && dataIndex) {
                    record.set(dataIndex, null);
                }
            });
        }
        return Ext.util.TSV.encode(ret);
    },
    getCells: function(format, erase) {
        var cmp = this.getCmp(),
            selectable = cmp.getSelectable(),
            selection = selectable && selectable.getSelection(),
            ret = [],
            dataIndex, lastRecord, record, row;
        if (selection) {
            selection.eachCell(function(location) {
                record = location.record;
                if (lastRecord !== record) {
                    lastRecord = record;
                    ret.push(row = {
                        model: record.self,
                        fields: []
                    });
                }
                dataIndex = location.column.getDataIndex();
                row.fields.push({
                    name: dataIndex,
                    value: record.data[dataIndex]
                });
                if (erase && dataIndex) {
                    record.set(dataIndex, null);
                }
            });
        }
        return ret;
    },
    getTextData: function(format, erase) {
        return this.getCellData(format, erase);
    },
    putCellData: function(data, format) {
        var cmp = this.getCmp(),
            values = Ext.util.TSV.decode(data, undefined, null),
            recCount = values.length,
            colCount = recCount ? values[0].length : 0,
            columns = cmp.getHeaderContainer().getVisibleColumns(),
            store = cmp.getStore(),
            maxRowIdx = store ? store.getCount() - 1 : 0,
            maxColIdx = columns.length - 1,
            selectable = cmp.getSelectable(),
            selection = selectable && selectable.getSelection(),
            row, sourceRowIdx, sourceColIdx, column, record, columnIndex, recordIndex, dataObject, destination, dataIndex, startColumnIndex, startRecordIndex;
        if (maxRowIdx <= 0 || maxColIdx <= 0) {
            return;
        }
        if (selection) {
            selection.eachCell(function(c) {
                destination = c;
                return false;
            });
        }
        startColumnIndex = destination ? destination.columnIndex : 0;
        startRecordIndex = destination ? destination.recordIndex : 0;
        for (sourceRowIdx = 0; sourceRowIdx < recCount; sourceRowIdx++) {
            row = values[sourceRowIdx];
            recordIndex = startRecordIndex + sourceRowIdx;
            if (recordIndex > maxRowIdx) {
                break;
            }
            record = store.getAt(recordIndex);
            dataObject = {};
            columnIndex = startColumnIndex;
            sourceColIdx = 0;
            while (sourceColIdx < colCount && columnIndex <= maxColIdx) {
                column = columns[columnIndex];
                dataIndex = column.getDataIndex();
                if (!column.getIgnoreExport()) {
                    if (dataIndex && (format === 'raw' || format === 'text')) {
                        dataObject[dataIndex] = row[sourceColIdx];
                    }
                    sourceColIdx++;
                }
                columnIndex++;
            }
            record.set(dataObject);
        }
    },
    putTextData: function(data, format) {
        this.putCellData(data, format);
    },
    getTarget: function(comp) {
        return comp.element;
    },
    privates: {
        validateAction: function(event) {
            var cmp = this.getCmp(),
                viewLocation = cmp.getNavigationModel().getLocation(),
                selectable = cmp.getSelectable(),
                checkColumn = selectable && selectable.getCheckbox();
            if (viewLocation && viewLocation.actionable && checkColumn !== viewLocation.column) {
                return false;
            }
        }
    }
});

Ext.define('Ext.grid.plugin.Editable', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.grideditable',
    config: {
        grid: null,
        triggerEvent: 'childdoubletap',
        formConfig: null,
        defaultFormConfig: {
            xtype: 'formpanel',
            scrollable: true,
            items: [
                {
                    xtype: 'fieldset'
                }
            ]
        },
        toolbarConfig: {
            xtype: 'titlebar',
            docked: 'top',
            items: [
                {
                    xtype: 'button',
                    ui: 'alt',
                    text: 'Cancel',
                    align: 'left',
                    action: 'cancel'
                },
                {
                    xtype: 'button',
                    ui: 'alt',
                    text: 'Submit',
                    align: 'right',
                    action: 'submit'
                }
            ]
        },
        enableDeleteButton: true
    },
    init: function(grid) {
        this.setGrid(grid);
        grid.setTouchAction({
            doubleTapZoom: false
        });
    },
    destroy: function() {
        this.cleanup();
        this.callParent();
    },
    updateGrid: function(grid, oldGrid) {
        var triggerEvent = this.getTriggerEvent();
        if (oldGrid) {
            oldGrid.un(triggerEvent, 'onTrigger', this);
        }
        if (grid) {
            grid.on(triggerEvent, 'onTrigger', this);
        }
    },
    onCancelTap: function() {
        this.sheet.hide();
    },
    onSubmitTap: function() {
        this.form.getRecord().set(this.form.getValues());
        this.sheet.hide();
    },
    onSheetHide: function() {
        this.cleanup();
    },
    getEditorFields: function(columns) {
        var fields = [],
            ln = columns.length,
            map = {},
            i, column, editor;
        for (i = 0; i < ln; i++) {
            column = columns[i];
            editor = column.ensureEditor();
            if (editor) {
                if (map[column.getDataIndex()]) {
                    Ext.raise('An editable column with the same dataIndex "' + column.getDataIndex() + '" already exists.');
                }
                map[column.getDataIndex()] = true;
                if (editor.isEditor) {
                    editor = editor.getField();
                }
                editor.setLabel(column.getText());
                editor.setName(column.getDataIndex());
                fields.push(editor);
            }
        }
        return fields;
    },
    onTrigger: function(grid, location) {
        var me = this,
            record = location.record,
            formConfig = me.getFormConfig(),
            toolbarConfig = me.getToolbarConfig(),
            fields, form, sheet, toolbar;
        if (!record || !location.row) {
            return;
        }
        if (formConfig) {
            me.form = form = Ext.factory(formConfig, Ext.form.Panel);
        } else {
            me.form = form = Ext.factory(me.getDefaultFormConfig());
            fields = me.getEditorFields(grid.getColumns());
            form.down('fieldset').setItems(fields);
            form.clearFields = true;
        }
        toolbar = Ext.factory(toolbarConfig, Ext.form.TitleBar);
        me.submitButton = toolbar.down('button[action=submit]');
        toolbar.down('button[action=cancel]').on('tap', 'onCancelTap', me);
        me.submitButton.on('tap', 'onSubmitTap', me);
        form.on({
            change: 'onFieldChange',
            delegate: 'field',
            scope: me
        });
        form.setRecord(record);
        me.sheet = sheet = grid.add({
            xtype: 'sheet',
            items: [
                toolbar,
                form
            ],
            hideOnMaskTap: true,
            enter: 'right',
            exit: 'right',
            right: 0,
            width: 320,
            layout: 'fit',
            stretchY: true,
            hidden: true
        });
        if (me.getEnableDeleteButton()) {
            form.add({
                xtype: 'button',
                text: 'Delete',
                ui: 'decline',
                margin: 10,
                handler: function() {
                    grid.getStore().remove(record);
                    sheet.hide();
                }
            });
        }
        sheet.on('hide', 'onSheetHide', me);
        sheet.show();
    },
    privates: {
        onFieldChange: function() {
            this.submitButton.setDisabled(!this.form.isValid());
        },
        cleanup: function() {
            var me = this,
                form = me.form;
            if (form && !form.destroyed && form.clearFields) {
                form.removeAll(false);
            }
            me.form = me.sheet = Ext.destroy(me.sheet);
        }
    }
});

Ext.define('Ext.grid.plugin.PagingToolbar', {
    extend: Ext.plugin.Abstract,
    alias: [
        'plugin.pagingtoolbar',
        'plugin.gridpagingtoolbar'
    ],
    mixins: [
        Ext.mixin.Hookable
    ],
    config: {
        grid: null,
        currentPage: 1,
        pageSize: 0,
        totalCount: 0,
        totalPages: 0,
        loadPages: null,
        buffer: 250,
        toolbar: {
            xtype: 'pagingtoolbar',
            docked: 'bottom'
        }
    },
    init: function(grid) {
        this.setGrid(grid);
        grid.add(this.getToolbar());
    },
    destroy: function() {
        this.setBuffer(null);
        this.setGrid(null);
        this.callParent();
    },
    updateGrid: function(grid, oldGrid) {
        var me = this;
        me.gridListeners = me.storeListeners = me.scrollListeners = Ext.destroy(me.gridListeners, me.storeListeners, me.scrollListeners);
        if (grid) {
            me.gridListeners = grid.on({
                updatevisiblecount: 'onUpdateVisibleCount',
                storechange: 'onStoreChanged',
                destroyable: true,
                scope: me
            });
            me.scrollListeners = grid.getScrollable().on({
                scrollend: 'checkPageChange',
                buffer: 100,
                scope: me
            });
            me.bindStore(grid.getStore());
        }
    },
    bindStore: function(store) {
        var me = this;
        Ext.destroy(me.storeListeners);
        me.getToolbar().setDisabled(!!store);
        if (!store) {
            return;
        }
        me.storeListeners = store.on({
            add: 'onTotalCountChange',
            remove: 'onTotalCountChange',
            refresh: 'onTotalCountChange',
            clear: 'onTotalCountChange',
            destroyable: true,
            scope: me
        });
        me.setLoadPages(store.pageSize > 0);
        me.cancelBufferTask();
        if (store.isLoaded()) {
            me.onTotalCountChange(store);
        }
    },
    onStoreChanged: function(grid, store) {
        this.bindStore(store);
    },
    getPageData: function() {
        var grid = this.getGrid(),
            store = grid.getStore(),
            totalCount = store.getTotalCount() || store.getCount(),
            pageSize = this.getLoadPages() ? store.pageSize : grid.visibleCount,
            pageCount = Math.ceil(totalCount / pageSize);
        return {
            totalCount: totalCount,
            totalPages: Ext.Number.isFinite(pageCount) ? pageCount : 1,
            currentPage: store.currentPage,
            pageSize: pageSize
        };
    },
    checkPageChange: function() {
        var me = this,
            grid = me.getGrid(),
            pageSize = me.getPageSize(),
            currentPage = me.getCurrentPage(),
            topVisibleIndex = grid.topVisibleIndex,
            newPage = Math.ceil((topVisibleIndex + pageSize) / pageSize);
        if (grid.getStore() && !me.getLoadPages() && newPage > 0 && newPage !== currentPage) {
            me.preventGridScroll = true;
            me.setCurrentPage(newPage);
            me.preventGridScroll = false;
        }
    },
    updateBuffer: function(buffer) {
        var me = this,
            bufferTask = me.bufferTask;
        if (Ext.isNumber(buffer)) {
            me.bufferTask = bufferTask || new Ext.util.DelayedTask(me.bufferTaskRun, me);
            me.cancelBufferTask();
        } else if (bufferTask) {
            bufferTask.cancel();
            me.bufferTask = null;
        }
    },
    cancelBufferTask: function() {
        if (this.bufferTask) {
            this.bufferTask.cancel();
        }
    },
    loadCurrentPage: function() {
        this.getGrid().getStore().loadPage(this.getCurrentPage());
    },
    bufferTaskRun: function() {
        this.loadCurrentPage();
    },
    applyToolbar: function(toolbar, oldToolbar) {
        return Ext.factory(toolbar, Ext.Toolbar, oldToolbar);
    },
    updateToolbar: function(toolbar) {
        var me = this;
        if (toolbar) {
            toolbar.getSliderField().on({
                change: 'onPageChange',
                dragstart: 'onPageSliderDrag',
                drag: 'onPageSliderDrag',
                dragend: 'onPageSliderDragEnd',
                scope: me
            });
            toolbar.getNextButton().on({
                tap: 'onNextPageTap',
                scope: me
            });
            toolbar.getPrevButton().on({
                tap: 'onPreviousPageTap',
                scope: me
            });
        }
    },
    onPageChange: function(field, value) {
        this.setCurrentPage(value);
    },
    onPageSliderDrag: function(field, slider, value) {
        this.isDragging = true;
        this.setCurrentPage(Ext.isArray(value) ? value[0] : value);
    },
    onPageSliderDragEnd: function() {
        var me = this;
        me.isDragging = false;
        if (me.getBuffer() === 'dragend' || me.bufferTask.Id) {
            me.cancelBufferTask();
            me.loadCurrentPage();
        }
    },
    onNextPageTap: function() {
        var nextPage = this.getCurrentPage() + 1;
        if (nextPage <= this.getTotalPages()) {
            this.setCurrentPage(nextPage);
        }
    },
    onPreviousPageTap: function() {
        var previousPage = this.getCurrentPage() - 1;
        if (previousPage > 0) {
            this.setCurrentPage(previousPage);
        }
    },
    onTotalCountChange: function(store) {
        var me = this,
            data = me.getPageData();
        me.bulkConfigs = true;
        me.setConfig(data);
        me.bulkConfigs = false;
        me.syncSummary();
    },
    onUpdateVisibleCount: function(grid, visibleCount) {
        var store = grid.getStore(),
            totalCount;
        if (store && !this.getLoadPages()) {
            visibleCount -= 1;
            this.setPageSize(visibleCount);
            totalCount = store.getTotalCount() || store.getCount();
            this.setTotalPages(Math.ceil(totalCount / visibleCount));
        }
    },
    updateTotalPages: function() {
        if (!this.isConfiguring) {
            this.syncSummary();
        }
    },
    updateCurrentPage: function(page) {
        var me = this,
            isDragging = me.isDragging,
            bufferTask = me.bufferTask,
            buffer = me.getBuffer();
        if (!me.isConfiguring) {
            if (me.getLoadPages()) {
                if (bufferTask && Ext.isNumber(buffer) && isDragging) {
                    bufferTask.delay(buffer);
                } else if (buffer !== 'dragend' || !isDragging) {
                    me.getGrid().getStore().loadPage(page);
                }
            } else {
                me.syncSummary();
            }
        }
    },
    updateTotalCount: function(totalCount) {
        if (!this.isConfiguring) {
            this.syncSummary();
        }
    },
    getPageTopRecord: function(page) {
        var grid = this.getGrid(),
            store = grid && grid.getStore(),
            pageSize = this.getPageSize(),
            pageTopRecordIndex = (page - 1) * pageSize;
        return store && store.getAt(pageTopRecordIndex);
    },
    privates: {
        syncSummary: function() {
            var me = this,
                grid = me.getGrid(),
                toolbar = me.getToolbar(),
                sliderField = toolbar.getSliderField(),
                currentPage = me.getCurrentPage(),
                totalPages = me.getTotalPages(),
                pageTopRecord;
            if (me.bulkConfigs) {
                return;
            }
            toolbar.getSummaryComponent().element.dom.innerHTML = currentPage + ' / ' + totalPages;
            sliderField.setMaxValue(totalPages || 1);
            sliderField.setValue(currentPage);
            sliderField.setDisabled(totalPages <= 1);
            pageTopRecord = me.getPageTopRecord(currentPage);
            if (grid && !me.preventGridScroll && pageTopRecord) {
                grid.scrollToRecord(pageTopRecord);
            }
            toolbar.getNextButton().setDisabled(currentPage === totalPages);
            toolbar.getPrevButton().setDisabled(currentPage === 1);
        }
    }
});

Ext.define('Ext.grid.plugin.RowDragDrop', {
    extend: Ext.plugin.dd.DragDrop,
    alias: 'plugin.gridrowdragdrop',
    handle: '.' + Ext.baseCSSPrefix + 'gridrow',
    groups: 'gridRowGroup',
    dropIndicator: Ext.baseCSSPrefix + 'grid-drop-indicator',
    dragText: '{0} selected row{1}',
    dragIcon: (Ext.supports.Touch && Ext.supports.TouchEvents) ? true : false,
    init: function(view) {
        var me = this;
        if (view.isLockedGrid) {
            me.addDragIndicator(view);
        }
        view.on('initialize', me.onViewInitialize, me);
    },
    onViewInitialize: function(view) {
        var me = this,
            dragZone = {};
        if (me.enableDrag) {
            if (me.proxy) {
                dragZone.proxy = me.proxy;
            }
            if (me.activateOnLongPress) {
                dragZone.activateOnLongPress = me.activateOnLongPress;
            }
            me.dragZone = new Ext.grid.GridDragZone(Ext.apply({
                element: view.bodyElement,
                view: view,
                dragText: me.dragText,
                handle: me.handle,
                groups: me.groups,
                scrollAmount: me.scrollAmount,
                containerScroll: me.containerScroll,
                constrain: Ext.getBody()
            }, dragZone));
        }
        if (me.enableDrop) {
            me.dropZone = new Ext.grid.GridDropZone({
                view: view,
                element: view.bodyElement,
                groups: me.groups,
                dropIndicator: me.dropIndicator,
                overCls: me.overCls,
                copy: me.copy
            });
        }
        if (!view.isLockedGrid) {
            me.addDragIndicator(view);
        }
    },
    addDragIndicator: function(view) {
        if (!this.dragIcon) {
            return;
        }
        if (view.isLockedGrid) {
            view.on({
                columnremove: 'onColumnRemove',
                createregion: 'onCreateRegion',
                scope: this
            });
        } else if (view.insertColumn) {
            view.insertColumn(0, {
                xtype: 'dragcolumn'
            });
        }
    },
    onCreateRegion: function(grid, columns) {
        columns = Ext.Array.from(columns);
        if (columns.length && !grid.hasDragColumn) {
            columns = Ext.Array.insert(columns, 0, [
                {
                    xtype: 'dragcolumn'
                }
            ]);
            grid.hasDragColumn = true;
        }
        return columns;
    },
    onColumnRemove: function(regionGrid, column) {
        if (this.cmp.hasDragColumn && !column.isDragColumn) {
            Ext.asap(this.handleColumnMove, this);
        }
    },
    handleColumnMove: function() {
        var view = this.cmp,
            dragCol = view.query('dragcolumn')[0],
            leftRegion, leftGrid, centerRegion, columns;
        if (!dragCol) {
            return;
        }
        leftRegion = view.getRegion('left');
        leftGrid = leftRegion.getGrid();
        columns = leftGrid.getColumns();
        if (columns.indexOf(dragCol) !== -1 && columns.length === 1) {
            centerRegion = view.getRegion('center');
            centerRegion.getGrid().insertColumn(0, dragCol);
        } else if (columns.length && columns.indexOf(dragCol) === -1) {
            leftGrid.insertColumn(0, dragCol);
        }
    }
});

Ext.define('Ext.grid.plugin.RowExpander', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.rowexpander',
    config: {
        grid: null,
        column: {
            weight: -1100,
            xtype: 'gridcolumn',
            align: 'center',
            text: '',
            width: 50,
            resizable: false,
            hideable: false,
            sortable: false,
            editable: false,
            ignore: true,
            ignoreExport: true,
            cell: {
                xtype: 'expandercell'
            },
            menuDisabled: true
        }
    },
    expanderSelector: '.' + Ext.baseCSSPrefix + 'expandercell .' + Ext.baseCSSPrefix + 'icon-el',
    init: function(grid) {
        grid.setVariableHeights(true);
        this.setGrid(grid);
    },
    destroy: function() {
        var grid = this.getGrid(),
            col = this.colInstance;
        if (col && !grid.destroying) {
            grid.unregisterColumn(col, true);
        }
        this.callParent();
    },
    applyColumn: function(column, oldColumn) {
        return Ext.factory(Ext.apply({}, column), null, oldColumn);
    },
    updateGrid: function(grid) {
        var me = this;
        if (grid) {
            grid.hasRowExpander = true;
            grid.addCls(Ext.baseCSSPrefix + 'has-rowexpander');
            me.colInstance = grid.registerColumn(me.getColumn());
            grid.refreshScrollerSize();
            grid.element.on({
                tap: 'onGridTap',
                delegate: me.expanderSelector,
                scope: me
            });
        }
    },
    onGridTap: function(e) {
        var cell = Ext.Component.from(e),
            row = cell.row;
        if (row.getGrid() === this.getGrid()) {
            row.toggleCollapsed();
        }
    }
});

Ext.define('Ext.grid.plugin.RowOperations', {
    extend: Ext.plugin.Abstract,
    alias: [
        'plugin.rowoperations',
        'plugin.multiselection',
        'plugin.gridmultiselection'
    ],
    alternateClassName: 'Ext.grid.plugin.MultiSelection',
    config: {
        operation: {
            lazy: true,
            $value: {
                xtype: 'button',
                ui: 'alt decline',
                align: 'right',
                handler: 'me.onOperationTap',
                margin: '0 0 0 10'
            }
        },
        selectButton: {
            lazy: true,
            $value: {
                xtype: 'button',
                ui: 'alt',
                align: 'right',
                margin: '0 0 0 10'
            }
        },
        selectionColumn: {
            sortable: false
        },
        useTriggerButton: true,
        triggerText: 'Select',
        cancelText: 'Done',
        deleteText: 'Delete',
        disableSelection: true,
        selecting: null
    },
    init: function(grid) {
        if (!this.useSelectButton()) {
            this.setSelecting(true);
        }
        if (this.getDisableSelection()) {
            grid.setDisableSelection(true);
        }
    },
    destroy: function() {
        this.setOperation(null);
        this.setSelectButton(null);
        this.callParent();
    },
    getRecords: function() {
        var grid = this.cmp;
        return grid.getSelections();
    },
    onOperationTap: function() {
        this.deleteSelectedRecords();
    },
    onTriggerTap: function() {
        this.setSelecting(!this.getSelecting());
    },
    applyOperation: function(config, button) {
        return Ext.updateWidget(button, config, this, 'createOperation');
    },
    createOperation: function(config) {
        var me = this,
            ret = Ext.apply({
                text: me.getDeleteText()
            }, config);
        ret.plugin = me;
        if (ret.handler === 'me.onOperationTap') {
            ret.handler = 'onOperationTap';
            ret.scope = me;
        }
        return ret;
    },
    updateOperation: function(operation) {
        var selectButton, titleBar, container;
        if (operation) {
            selectButton = this.useSelectButton();
            titleBar = this.cmp.getTitleBar();
            if (titleBar) {
                if (selectButton) {
                    container = selectButton.getParent();
                    titleBar.insert(container.indexOf(selectButton), operation);
                } else {
                    titleBar.add(operation);
                }
            }
        }
    },
    applySelectButton: function(config, button) {
        return Ext.updateWidget(button, config, this, 'createSelectButton');
    },
    createSelectButton: function(config) {
        var me = this,
            ret = Ext.apply({
                text: me.getTriggerText()
            }, config);
        ret.handler = 'onTriggerTap';
        ret.scope = me;
        return ret;
    },
    updateSelectButton: function(selectButton) {
        if (selectButton) {
            this.cmp.getTitleBar().add(selectButton);
        }
    },
    updateSelecting: function(selecting) {
        var me = this,
            grid = me.cmp,
            disableSelection = me.getDisableSelection(),
            operation = me.getOperation(),
            selectButton = me.useSelectButton(),
            selectionModel = grid.getSelectable();
        if (operation) {
            operation.setHidden(!selecting);
        }
        if (selectButton) {
            selectButton.setText(selecting ? me.getCancelText() : me.getTriggerText());
        }
        if (disableSelection) {
            grid.setDisableSelection(!selecting);
        }
        selectionModel.setCheckbox(selecting && me.getSelectionColumn());
        selectionModel.setMode(selecting ? 'multi' : 'single');
        if (disableSelection || !selecting) {
            selectionModel.deselectAll();
        }
    },
    privates: {
        deleteSelectedRecords: function() {
            var records = this.getRecords(),
                store = this.cmp.getStore();
            store.remove(records);
        },
        useSelectButton: function() {
            var me = this,
                titleBar = me.cmp.getTitleBar();
            return me.getUseTriggerButton() && titleBar && titleBar.getTitle() && me.getSelectButton();
        }
    }
});

Ext.define('Ext.grid.plugin.Summary', {
    extend: Ext.plugin.Abstract,
    alias: [
        'plugin.gridsummary',
        'plugin.summaryrow',
        'plugin.gridsummaryrow'
    ],
    alternateClassName: 'Ext.grid.plugin.SummaryRow',
    mixins: [
        Ext.mixin.Bufferable,
        Ext.mixin.StoreWatcher
    ],
    config: {
        row: {
            lazy: true,
            $value: {
                xtype: 'gridsummaryrow',
                docked: 'bottom'
            }
        }
    },
    inheritUi: true,
    storeListeners: {
        add: 'syncSummary',
        clear: 'syncSummary',
        remove: 'syncSummary',
        refresh: 'syncSummary',
        update: 'syncSummary'
    },
    bufferableMethods: {
        syncSummary: 5
    },
    init: function(grid) {
        var scrollable = grid.getScrollable(),
            row, rowScroller;
        this.setOwner(grid);
        row = this.getRow();
        grid.addCls(Ext.baseCSSPrefix + 'grid-has-summaryrow');
        if (scrollable) {
            rowScroller = row.getScrollable();
            if (!rowScroller) {
                row.setScrollable({
                    x: false,
                    y: false
                });
                rowScroller = row.getScrollable();
            }
            rowScroller.addPartner(scrollable, 'x');
        }
    },
    destroy: function() {
        this.setOwner(null);
        this.callParent();
    },
    createRow: function(config) {
        return Ext.apply({
            viewModel: this.getOwner().getItemConfig().viewModel
        }, config);
    },
    applyRow: function(row) {
        if (row) {
            row = this.createRow(row);
            row = this.cmp.add(row);
        }
        return row;
    },
    updateStore: function(store, oldStore) {
        this.mixins.storewatcher.updateStore.call(this, store, oldStore);
        if (store && store.isLoaded()) {
            this.syncSummary();
        }
    },
    privates: {
        doSyncSummary: function() {
            var row = this.getRow();
            if (row) {
                row.syncSummary();
            }
        },
        onContainerScroll: function(scr, x) {
            var item = this.getRow(),
                scroller;
            if (!(scroller = item.getScrollable())) {
                item.setScrollable({
                    x: false,
                    y: false
                });
                scroller = item.getScrollable();
            }
            scroller.scrollTo(x, null);
        }
    }
});

Ext.define('Ext.grid.plugin.ViewOptionsListItem', {
    extend: Ext.dataview.SimpleListItem,
    xtype: 'viewoptionslistitem',
    toolDefaults: {
        hideMode: 'visibility'
    },
    tools: {
        handle: {
            zone: 'start',
            cls: Ext.baseCSSPrefix + 'no-ripple',
            iconCls: Ext.baseCSSPrefix + 'column-options-sortablehandle'
        },
        icon: {
            zone: 'start',
            iconCls: ''
        },
        group: {
            zone: 'end',
            iconCls: Ext.baseCSSPrefix + 'column-options-groupindicator',
            stopEvent: false
        },
        hide: {
            zone: 'end',
            iconCls: Ext.baseCSSPrefix + 'column-options-visibleindicator',
            stopEvent: false
        }
    },
    cls: Ext.baseCSSPrefix + 'column-options-item',
    updateRecord: function(record, oldRecord) {
        var me = this,
            tool;
        if (!record) {
            return;
        }
        me.callParent([
            record,
            oldRecord
        ]);
        me.toggleCls(me.hiddenColumnCls, record.get('hidden'));
        me.toggleCls(me.groupedColumnCls, record.get('grouped'));
        tool = me.lookupTool('icon');
        tool.setIconCls(record.get('header') ? me.headerCls : me.leafCls);
        me.lookupTool('group').setHidden(!record.get('groupable'));
        me.lookupTool('hide').setHidden(!record.get('hideable'));
    },
    privates: {
        groupedColumnCls: Ext.baseCSSPrefix + 'column-options-grouped',
        headerCls: Ext.baseCSSPrefix + 'column-options-folder',
        hiddenColumnCls: Ext.baseCSSPrefix + 'column-options-hidden',
        leafCls: Ext.baseCSSPrefix + 'column-options-leaf'
    }
});

Ext.define('Ext.grid.plugin.ViewOptions', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.gridviewoptions',
    config: {
        grid: null,
        sheetWidth: 320,
        sheet: {
            lazy: true,
            $value: {
                xtype: 'sheet',
                cls: Ext.baseCSSPrefix + 'gridviewoptions',
                items: [
                    {
                        docked: 'top',
                        xtype: 'titlebar',
                        title: 'Customize',
                        items: [
                            {
                                xtype: 'button',
                                text: 'Done',
                                ui: 'action',
                                align: 'right',
                                role: 'donebutton'
                            }
                        ]
                    }
                ],
                hidden: true,
                hideOnMaskTap: true,
                enter: 'right',
                exit: 'right',
                modal: true,
                right: 0,
                layout: 'fit',
                stretchY: true
            }
        },
        columnList: {
            lazy: true,
            $value: {
                xtype: 'nestedlist',
                title: 'Columns',
                clearSelectionOnListChange: false,
                listConfig: {
                    triggerEvent: null,
                    infinite: true,
                    mode: 'MULTI',
                    variableHeights: true,
                    plugins: {
                        sortablelist: {
                            source: {
                                handle: '.' + Ext.baseCSSPrefix + 'column-options-sortablehandle'
                            }
                        }
                    },
                    itemConfig: {
                        xtype: 'viewoptionslistitem'
                    },
                    itemTpl: '{text}'
                },
                store: {
                    type: 'tree',
                    fields: [
                        'id',
                        'text',
                        'dataIndex',
                        'header',
                        'hidden',
                        'hideable',
                        'grouped',
                        'groupable'
                    ],
                    root: {
                        text: 'Columns'
                    }
                }
            }
        },
        visibleIndicatorSelector: '.' + Ext.baseCSSPrefix + 'column-options-visibleindicator',
        groupIndicatorSelector: '.' + Ext.baseCSSPrefix + 'column-options-groupindicator'
    },
    init: function(grid) {
        this.setGrid(grid);
    },
    destroy: function() {
        this.destroyMembers('sheet', 'columnList');
        this.callParent();
    },
    updateGrid: function(grid, oldGrid) {
        if (oldGrid) {
            oldGrid.getHeaderContainer().renderElement.un({
                contextmenu: 'onHeaderContextMenu',
                longpress: 'onHeaderLongPress',
                scope: this
            });
            oldGrid.un({
                columnadd: 'onColumnAdd',
                columnmove: 'onColumnMove',
                columnremove: 'onColumnRemove',
                columnhide: 'onColumnHide',
                columnshow: 'onColumnShow',
                scope: this
            });
        }
        if (grid) {
            grid.getHeaderContainer().renderElement.on({
                contextmenu: 'onHeaderContextMenu',
                longpress: 'onHeaderLongPress',
                scope: this
            });
        }
    },
    applySheet: function(sheet) {
        if (sheet && !sheet.isComponent) {
            sheet = Ext.factory(sheet, Ext.Sheet);
        }
        return sheet;
    },
    applyColumnList: function(list) {
        if (list && !list.isComponent) {
            list = Ext.factory(list, Ext.Container);
        }
        return list;
    },
    updateColumnList: function(list) {
        if (list) {
            list.on({
                listchange: 'onListChange',
                scope: this
            });
            list.on('dragsort', 'onColumnDrag', this, {
                delegate: '> list'
            });
            this.attachTapListeners();
        }
    },
    updateSheet: function(sheet) {
        sheet.setWidth(this.getSheetWidth());
        sheet.add(this.getColumnList());
        sheet.on('hide', 'onSheetHide', this);
    },
    onDoneButtonTap: function() {
        this.getSheet().hide();
    },
    onColumnDrag: function(list, row, newIndex) {
        var column = Ext.getCmp(row.getRecord().get('id')),
            parent = column.getParent(),
            siblings = parent.getInnerItems(),
            i, ln, sibling;
        for (i = 0 , ln = newIndex; i < ln; i++) {
            sibling = siblings[i];
            if (!sibling.isHeaderGroup && sibling.getIgnore()) {
                newIndex += 1;
            }
        }
        this.isMoving = true;
        parent.insert(newIndex, column);
        this.isMoving = false;
    },
    attachTapListeners: function() {
        var activeList = this.getColumnList().getActiveItem();
        if (!activeList.hasAttachedTapListeners) {
            activeList.onBefore({
                childtap: 'onListChildTap',
                scope: this
            });
            activeList.hasAttachedTapListeners = true;
        }
    },
    onListChange: function(nestedList, list) {
        var store = list.getStore(),
            activeNode = store.getNode(),
            records = activeNode.childNodes,
            ln = records.length,
            i, column, record;
        for (i = 0; i < ln; i++) {
            record = records[i];
            column = Ext.getCmp(record.getId());
            record.set('hidden', column.isHidden());
        }
        this.attachTapListeners();
    },
    onListChildTap: function(list, location) {
        var me = this,
            handled = false,
            e = location.event;
        if (Ext.fly(e.target).is(me.getVisibleIndicatorSelector())) {
            me.onVisibleIndicatorTap(location.row, location.record);
            handled = true;
        } else if (Ext.fly(e.target).is(me.getGroupIndicatorSelector())) {
            me.onGroupIndicatorTap(location.row, location.record);
            handled = true;
        }
        return !handled;
    },
    onVisibleIndicatorTap: function(row, record) {
        var hidden = !record.get('hidden'),
            column = Ext.getCmp(record.get('id'));
        column.setHidden(hidden);
        record.set('hidden', hidden);
    },
    onGroupIndicatorTap: function(row, record) {
        var me = this,
            grouped = !record.get('grouped'),
            store = me.getGrid().getStore();
        this.getListRoot().cascade(function(node) {
            node.set('grouped', false);
        });
        if (grouped) {
            store.setGrouper({
                property: record.get('dataIndex')
            });
            record.set('grouped', true);
        } else {
            store.setGrouper(null);
        }
    },
    onColumnHide: function(headerContainer, column) {
        var nestedList = this.getColumnList(),
            activeList = nestedList.getActiveItem(),
            store = activeList.getStore(),
            record = store.getById(column.getId());
        if (record) {
            record.set('hidden', true);
        }
    },
    onColumnShow: function(headerContainer, column) {
        var nestedList = this.getColumnList(),
            activeList = nestedList.getActiveItem(),
            store = activeList.getStore(),
            record = store.getById(column.getId());
        if (record) {
            record.set('hidden', false);
        }
    },
    onColumnAdd: function(grid, column) {
        var me = this,
            nestedList, mainHeaderCt, header, store, parentNode, isGridGrouped, grouper, dataIndex, data, idx, headerNode;
        if (column.getIgnore() || this.isMoving) {
            return;
        }
        nestedList = me.getColumnList();
        mainHeaderCt = grid.getHeaderContainer();
        header = column.getParent();
        store = nestedList.getStore();
        parentNode = store.getRoot();
        isGridGrouped = grid.getGrouped();
        grouper = grid.getStore().getGrouper();
        dataIndex = column.getDataIndex();
        data = {
            id: column.getId(),
            text: column.getText() || '\xa0',
            groupable: isGridGrouped && column.canGroup(),
            hidden: column.isHidden(),
            hideable: column.getHideable(),
            grouped: !!(isGridGrouped && grouper && grouper.getProperty() === dataIndex),
            dataIndex: column.getDataIndex(),
            leaf: true
        };
        if (header !== mainHeaderCt) {
            headerNode = parentNode.findChild('id', header.getId());
            if (!headerNode) {
                idx = header.getParent().indexOf(header);
                headerNode = parentNode.insertChild(idx, {
                    groupable: false,
                    header: true,
                    hidden: header.isHidden(),
                    id: header.getId(),
                    text: header.getText()
                });
            }
            idx = header.indexOf(column);
            parentNode = headerNode;
        } else {
            idx = mainHeaderCt.indexOf(column);
        }
        parentNode.insertChild(idx, data);
    },
    onColumnMove: function(headerContainer, column, header) {
        this.onColumnRemove(headerContainer, column);
        this.onColumnAdd(headerContainer, column, header);
    },
    onColumnRemove: function(headerContainer, column) {
        var root, record;
        if (column.getIgnore() || this.isMoving) {
            return;
        }
        root = this.getListRoot();
        record = root.findChild('id', column.getId(), true);
        if (record) {
            record.parentNode.removeChild(record, true);
        }
    },
    onHeaderContextMenu: function(e) {
        e.preventDefault();
    },
    onHeaderLongPress: function(e) {
        if (!this.getSheet().isVisible()) {
            this.showViewOptions();
        }
    },
    hideViewOptions: function() {
        var me = this,
            sheet = me.getSheet();
        me.getGrid().getHeaderContainer().setSortable(me.cachedSortable);
        delete me.cachedSortable;
        sheet.hide();
    },
    onSheetHide: function() {
        this.hideViewOptions();
    },
    showViewOptions: function() {
        var me = this,
            sheet = me.getSheet(),
            header;
        me.setup();
        if (!sheet.isVisible()) {
            header = me.getGrid().getHeaderContainer();
            me.cachedSortable = header.getSortable();
            header.setSortable(false);
            me.updateListInfo();
            sheet.show();
        }
    },
    privates: {
        getListRoot: function() {
            return this.getColumnList().getStore().getRoot();
        },
        setup: function() {
            var me = this,
                grid = me.getGrid(),
                sheet, root;
            if (me.doneSetup) {
                return;
            }
            me.doneSetup = true;
            root = this.getListRoot();
            root.removeAll();
            grid.getColumns().forEach(function(leaf) {
                me.onColumnAdd(grid, leaf);
            });
            grid.on({
                columnadd: 'onColumnAdd',
                columnmove: 'onColumnMove',
                columnremove: 'onColumnRemove',
                columnhide: 'onColumnHide',
                columnshow: 'onColumnShow',
                scope: me
            });
            sheet = me.getSheet();
            sheet.down('button[role=donebutton]').on({
                tap: 'onDoneButtonTap',
                scope: me
            });
        },
        updateListInfo: function() {
            var grid = this.getGrid(),
                store = grid.getStore(),
                grouper = store.getGrouper(),
                isGridGrouped = grid.getGrouped(),
                grouperProp = grouper && grouper.getProperty();
            this.getColumnList().getStore().getRoot().cascade(function(node) {
                var grouped = false,
                    dataIndex;
                if (isGridGrouped) {
                    dataIndex = node.get('dataIndex');
                    grouped = dataIndex && dataIndex === grouperProp;
                }
                node.set('grouped', dataIndex && grouped);
            });
        }
    }
});

Ext.define('Ext.grid.rowedit.Bar', {
    extend: Ext.Panel,
    xtype: 'roweditorbar',
    isRowEditorBar: true,
    mixins: [
        Ext.mixin.Bufferable
    ],
    config: {
        active: null,
        defaultCellUI: null,
        grid: null
    },
    layout: {
        type: 'hbox'
    },
    autoSize: true,
    scrollable: {
        monitorScroll: true,
        x: false,
        y: false
    },
    ui: 'roweditor',
    bufferableMethods: {
        syncColumns: 50
    },
    gridHeaderListeners: null,
    gridListeners: null,
    doDestroy: function() {
        this.setActive(false);
        this.callParent();
    },
    commit: function() {
        this.eachEditor(function(item, driver) {
            driver.commit(item);
        });
    },
    eachEditor: function(fn) {
        var items = this.items.items,
            driver, i, item, ret;
        for (i = 0; i < items.length; ++i) {
            item = items[i];
            if (item.$hasValue) {
                driver = item.$driver;
                if (driver) {
                    if ((ret = fn(item, driver)) === false) {
                        break;
                    }
                }
            }
        }
        return ret;
    },
    getEditorValues: function(out, all) {
        this.eachEditor(function(item, driver) {
            if (all || (item.$hasValue && item.isDirty())) {
                (out || (out = {}))[item.$column.getDataIndex()] = driver.get(item);
            }
        });
        return out;
    },
    getDriver: function(cell) {
        var me = this,
            drivers = me.plugin.getDrivers(),
            driver = drivers[cell.xtype],
            base = drivers.default,
            xtypes = cell.xtypes,
            i;
        if (cell.driver) {
            driver = Ext.apply({}, drivers[cell.driver], driver);
        }
        if (xtypes) {
            for (i = 0; !driver && i < xtypes.length; ++i) {
                driver = drivers[xtypes[i]];
            }
        }
        if (driver && driver !== base) {
            driver = Ext.apply({}, driver, base);
        }
        return driver || base;
    },
    hasVerticalScroller: function() {
        var grid = this.grid,
            region = grid.region,
            visibleGrids = region && region.lockedGrid;
        if (visibleGrids) {
            visibleGrids = visibleGrids.visibleGrids;
            return grid === visibleGrids[visibleGrids.length - 1];
        }
        return true;
    },
    isClean: function() {
        return !this.isDirty();
    },
    isDirty: function() {
        var dirty = false;
        this.eachEditor(function(item) {
            dirty = item.isDirty();
            return !dirty;
        });
        return dirty;
    },
    isValid: function() {
        var valid = false;
        this.eachEditor(function(item) {
            valid = item.validate();
            return valid;
        });
        return valid;
    },
    onHorizontalOverflowChange: function() {
        this.syncTop();
    },
    onScroll: function(grid, info) {
        if (info.y !== info.oldY) {
            this.syncTop();
        }
    },
    onVerticalOverflowChange: function() {
        if (this.hasVerticalScroller()) {
            this.parent.syncWidth();
        }
    },
    onVisibleHeightChange: function() {
        this.syncTop();
    },
    resetChanges: function() {
        this.eachEditor(function(item, driver) {
            driver.reset(item);
        });
    },
    setFieldValues: function(values) {
        this.eachEditor(function(item, driver) {
            var field = item.$column.getDataIndex();
            if (field in values) {
                driver.set(item, values[field]);
            }
        });
    },
    updateActive: function(active) {
        var me = this,
            grid = me.grid,
            gridScroller, items, region, scroller;
        if (!grid || grid.destroying) {
            active = false;
        } else {
            gridScroller = grid.getScrollable();
            scroller = me.getScrollable();
        }
        me.gridListeners = me.gridHeaderListeners = me.gridRegionListeners = Ext.destroy(me.gridListeners, me.gridHeaderListeners, me.gridRegionListeners);
        if (active) {
            me.syncColumns();
            scroller.scrollTo(gridScroller.getPosition().x, null);
            gridScroller.addPartner(scroller, 'x');
            me.gridListeners = grid.on({
                scope: me,
                destroyable: true,
                horizontaloverflowchange: 'onHorizontalOverflowChange',
                scroll: 'onScroll',
                verticaloverflowchange: 'onVerticalOverflowChange',
                visibleheightchange: 'onVisibleHeightChange'
            });
            region = grid.region;
            if (region && region.isLockedGridRegion) {
                me.gridRegionListeners = region.el.on({
                    scope: me,
                    destroyable: true,
                    resize: 'syncColumns'
                });
            }
            me.gridHeaderListeners = grid.getHeaderContainer().on({
                scope: me,
                destroyable: true,
                columnadd: 'syncColumns',
                columnhide: 'syncColumns',
                columnmove: 'syncColumns',
                columnremove: 'syncColumns',
                columnresize: 'syncColumns',
                columnshow: 'syncColumns'
            });
        } else {
            items = me.query('> [isRowEditorItem!=true]');
            if (items.length) {
                me.remove(items, false);
            }
            if (gridScroller) {
                gridScroller.removePartner(scroller);
            }
        }
    },
    updateGrid: function(grid, oldGrid) {
        var me = this;
        me.grid = grid;
        if (me.getActive()) {
            me.updateActive(true);
        }
    },
    updateRecord: function() {
        this.syncColumns();
    },
    doSyncColumns: function() {
        var me = this,
            grid = me.grid,
            record = me.getRecord(),
            items = me.items.items,
            columns, context, i, item, n, region, width;
        if (grid && !grid.destroying) {
            region = grid.region;
            if (region && region.lockedGrid) {
                width = region.measure('w');
                if (grid.getVerticalOverflow() && me.hasVerticalScroller()) {
                    width -= Ext.scrollbar.width();
                }
                me.setWidth(Math.floor(width));
            }
            if (record) {
                columns = grid.getHeaderContainer().getVisibleColumns();
                context = {
                    editors: [],
                    gap: 0,
                    gaps: me.query('> roweditorgap'),
                    index: 0,
                    record: record,
                    total: 0
                };
                for (i = 0 , n = columns.length; i < n; ++i) {
                    me.syncColumn(columns[i], context);
                }
                for (i = context.index; i < items.length; ) {
                    item = items[i];
                    if (item.isRowEditorItem) {
                        item.destroy();
                    } else {
                        me.remove(item, false);
                    }
                }
                me.lastSyncRecord = record;
                me.getScrollable().setSize(context.total, 0);
            }
        }
    },
    syncColumn: function(col, context) {
        var me = this,
            adapters = me.plugin.getAdapters(),
            defaultAdapter = adapters.default,
            cellConfig = col.getCell(),
            cellType = cellConfig.xtype,
            adapter = adapters[cellType],
            itemId = col.$editorItemId,
            dataIndex = col.getDataIndex(),
            record = context.record,
            width = col.getComputedWidth(),
            gap = context.gap,
            cell, driver, gapCmp, value;
        context.total += width;
        value = record.data[dataIndex];
        if (!itemId || !(cell = me.getComponent(itemId))) {
            if (!(cell = col.ensureEditor())) {
                if (adapter !== null) {
                    cell = Ext.apply({
                        itemId: itemId = col.getId(),
                        align: col.getAlign(),
                        column: col,
                        width: width
                    }, adapter, defaultAdapter);
                    driver = me.getDriver(cell);
                }
                if (driver && driver.read) {
                    value = driver.read(record, col, me);
                } else if (!dataIndex) {
                    adapter = null;
                }
                if (adapter !== null) {
                    cell[driver.prop] = driver.convert(value, col);
                } else {
                    cell = null;
                    context.gap += width;
                }
            } else {
                driver = me.getDriver(cell);
                itemId = cell.getId();
                cell._validationRecord = record;
                cell.$hasValue = true;
                cell.addUi('celleditor');
                driver.set(cell, value);
                driver.commit(cell);
            }
            if (cell) {
                col.$editorItemId = itemId;
                cell.$driver = driver;
            }
        } else if (me.lastSyncRecord !== record) {
            driver = cell.$driver;
            if (driver.read) {
                value = driver.read(record, col, me);
            }
            cell._validationRecord = record;
            driver.set(cell, value);
            driver.commit(cell);
        }
        if (cell) {
            if (gap) {
                if (!(gapCmp = context.gaps.pop())) {
                    gapCmp = Ext.apply({
                        xtype: 'roweditorgap',
                        width: gap
                    }, defaultAdapter);
                } else {
                    gapCmp.setWidth(gap);
                }
                me.insert(context.index++, gapCmp);
                context.gap = 0;
            }
            cell = me.insert(context.index++, cell);
            cell.setWidth(width);
            if (cell.isRowEditorCell) {
                cell.$column = col;
            }
        }
    },
    syncTop: function() {
        this.parent.unanimated().syncTop();
    }
});

Ext.define('Ext.grid.rowedit.Cell', {
    extend: Ext.Component,
    xtype: 'roweditorcell',
    isRowEditorCell: true,
    isRowEditorItem: true,
    config: {
        align: null,
        column: null
    },
    cls: Ext.baseCSSPrefix + 'roweditorcell',
    updateAlign: function(align) {
        this.setUserCls(Ext.grid.cell.Base.prototype.alignCls[align]);
    }
});

Ext.define('Ext.plugin.TabGuard', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.tabguard',
    tabGuard: true,
    tabGuardTemplate: [
        {
            tag: 'span',
            'aria-hidden': 'true',
            cls: Ext.baseCSSPrefix + 'tab-guard-el'
        }
    ],
    tabGuardElements: {
        before: 'tabGuardBeforeEl',
        after: 'tabGuardAfterEl'
    },
    init: function(cmp) {
        var me = this;
        me.decorateComponent(cmp);
        if (cmp.addTool) {
            cmp.addTool = Ext.Function.createSequence(cmp.addTool, me.maybeInitTabGuards, me);
        }
        if (cmp.add) {
            cmp.add = Ext.Function.createSequence(cmp.add, me.maybeInitTabGuards, me);
        }
        if (cmp.remove) {
            cmp.remove = Ext.Function.createSequence(cmp.remove, me.maybeInitTabGuards, me);
        }
        cmp.onRender = Ext.Function.createSequence(cmp.onRender, me.maybeInitTabGuards, me);
        cmp.getTabGuard = me.getTabGuard.bind(me);
        cmp.on('show', me.initTabGuards, me);
    },
    destroy: function() {
        var cmp = this.getCmp();
        if (cmp) {
            delete cmp.addTool;
            delete cmp.add;
            delete cmp.remove;
        }
        this.callParent();
    },
    privates: {
        decorateComponent: function(cmp) {
            var me = this,
                tpl = me.tabGuardTemplate;
            cmp = cmp || me.getCmp();
            cmp[me.tabGuardElements.before] = cmp.el.insertFirst(tpl);
            cmp[me.tabGuardElements.after] = cmp.el.createChild(tpl);
        },
        getTabGuard: function(position) {
            var cmp = this.getCmp(),
                prop = this.tabGuardElements[position];
            return cmp[prop];
        },
        maybeInitTabGuards: function() {
            var cmp = this.getCmp();
            if (cmp.rendered && cmp.initialized && cmp.tabGuard) {
                this.initTabGuards();
            }
        },
        initTabGuards: function() {
            var me = this,
                cmp = me.getCmp(),
                minTabIndex = me.tabGuardBeforeIndex || 0,
                maxTabIndex = me.tabGuardAfterIndex || 0,
                beforeGuard = me.getTabGuard('before'),
                afterGuard = me.getTabGuard('after'),
                i, tabIndex, nodes;
            if (!cmp.rendered || !cmp.tabGuard) {
                return;
            }
            nodes = cmp.el.findTabbableElements({
                skipSelf: true
            });
            if (nodes[0] === beforeGuard.dom) {
                nodes.shift();
            }
            if (nodes[nodes.length - 1] === afterGuard.dom) {
                nodes.pop();
            }
            if (nodes && nodes.length) {
                if (minTabIndex == null || maxTabIndex == null) {
                    for (i = 0; i < nodes.length; i++) {
                        tabIndex = +nodes[i].getAttribute('tabIndex');
                        if (tabIndex > 0) {
                            minTabIndex = Math.min(minTabIndex, tabIndex);
                            maxTabIndex = Math.max(maxTabIndex, tabIndex);
                        }
                    }
                }
                beforeGuard.dom.setAttribute('tabIndex', minTabIndex);
                afterGuard.dom.setAttribute('tabIndex', maxTabIndex);
            } else {
                beforeGuard.dom.removeAttribute('tabIndex');
                afterGuard.dom.removeAttribute('tabIndex');
            }
            if (!beforeGuard.hasListeners.focusenter) {
                beforeGuard.on('focusenter', me.onTabGuardFocusEnter, cmp);
            }
            if (!afterGuard.hasListeners.focusenter) {
                afterGuard.on('focusenter', me.onTabGuardFocusEnter, cmp);
            }
        },
        onTabGuardFocusEnter: function(e, target) {
            var cmp = this,
                el = cmp.el,
                beforeGuard = cmp.getTabGuard('before'),
                afterGuard = cmp.getTabGuard('after'),
                from = e.relatedTarget,
                nodes, forward, nextFocus;
            nodes = el.findTabbableElements({
                skipSelf: true
            });
            if (nodes[0] === beforeGuard.dom) {
                nodes.shift();
            }
            if (nodes[nodes.length - 1] === afterGuard.dom) {
                nodes.pop();
            }
            if (nodes.length === 0) {
                nextFocus = el;
            }
            else if (from === el.dom) {
                forward = target === beforeGuard.dom;
            }
            else if (el.contains(from)) {
                forward = !!e.forwardTab;
            } else {
                forward = target === beforeGuard.dom;
            }
            nextFocus = nextFocus || (forward ? nodes[0] : nodes[nodes.length - 1]);
            if (nextFocus) {
                Ext.fly(nextFocus).focus(nodes.length === 1 ? 1 : 0);
            }
        }
    }
});

Ext.define('Ext.grid.rowedit.Editor', {
    extend: Ext.dataview.ListItem,
    xtype: 'roweditor',
    isRowEditor: true,
    mixins: [
        Ext.mixin.StoreWatcher,
        Ext.panel.Buttons
    ],
    ownerProperty: 'grid',
    config: {
        buttonContainer: {
            xtype: 'panel',
            ui: 'roweditor-buttons',
            alignSelf: 'center',
            border: true,
            bodyBorder: false,
            defaultType: 'button',
            top: 40,
            weighted: true,
            layout: {
                type: 'hbox',
                align: 'center'
            }
        },
        minButtonWidth: null
    },
    classCls: Ext.baseCSSPrefix + 'roweditor',
    buttonCtCls: Ext.baseCSSPrefix + 'roweditor-button-ct',
    bubbleDirty: false,
    defaultType: 'roweditorbar',
    html: null,
    nameHolder: true,
    plugins: 'tabguard',
    tabGuard: true,
    keyMap: {
        ESC: 'cancel',
        ENTER: 'saveAndClose',
        'CmdOrCtrl+Enter': 'onSaveAndNext',
        'CmdOrCtrl+Down': 'onNextRecord',
        'CmdOrCtrl+Up': 'onPrevRecord',
        HOME: 'onHome',
        END: 'onEnd',
        PAGE_DOWN: 'onPageDown',
        PAGE_UP: 'onPageUp',
        scope: 'this'
    },
    layout: {
        type: 'hbox'
    },
    storeListeners: {
        refresh: 'onStoreRefresh'
    },
    activeLocation: null,
    activeRange: null,
    recordIndex: -1,
    initialize: function() {
        this.callParent();
        this.el.on({
            keydown: function(e) {
                e.stopPropagation();
            }
        });
    },
    cancel: function() {
        this.hide();
    },
    getChanges: function() {
        return this.getEditorValues(false);
    },
    getEditItem: function(column) {
        var ret = null,
            id = column.$editorItemId;
        if (id) {
            this.eachBar(function(bar) {
                ret = bar.getComponent(id);
                return !ret;
            });
        }
        return ret;
    },
    getEditorValues: function(all) {
        var values = {};
        all = all !== false;
        this.eachBar('getEditorValues', [
            values,
            all
        ]);
        return (all || !Ext.Object.isEmpty(values)) ? values : null;
    },
    isDirty: function() {
        return this.eachBar('isClean') === false;
    },
    isValid: function() {
        return this.eachBar('isValid') && this.parent.fireEvent('validateedit', this.activeLocation) !== false;
    },
    resetChanges: function() {
        this.eachBar('resetChanges');
    },
    revertChanges: function() {
        var me = this,
            modified = me.getRecord();
        me.resetChanges();
        modified = modified && modified.modified;
        if (modified) {
            me.setFieldValues(modified);
        }
    },
    saveAndClose: function() {
        if (this.saveChanges(true)) {
            this.hide();
        }
    },
    setFieldValues: function(values) {
        this.eachBar('setFieldValues', [
            values
        ]);
    },
    updateButtons: function(buttonCt) {
        if (buttonCt) {
            buttonCt.addCls(this.buttonCtCls);
        }
    },
    updateHidden: function(value, oldValue) {
        var me = this,
            plugin = me.plugin,
            editing = !value,
            location = me.activeLocation;
        me.callParent([
            value,
            oldValue
        ]);
        plugin.editing = editing;
        if (editing) {
            me.unanimated();
        } else {
            if (location && !plugin.grid.destroying) {
                plugin.grid.setLocation(location);
            }
            me.setRecord(null);
        }
        me.eachBar('setActive', [
            editing
        ]);
        if (editing) {
            me.ensureFocus();
        }
    },
    updateRecord: function(record, oldRecord) {
        var me = this,
            activeLocation = me.activeLocation,
            activeRange = me.activeRange,
            destroying = me.destroying,
            recordIndex, store;
        me.callParent([
            record,
            oldRecord
        ]);
        me.eachBar('setRecord', [
            record
        ]);
        if (record) {
            store = me.grid.store;
            if (activeRange && activeRange.store !== store) {
                activeRange = Ext.destroy(activeRange);
            }
            if (!activeRange) {
                me.activeRange = activeRange = store.createActiveRange();
            }
            me.recordIndex = recordIndex = store.indexOf(record);
            activeRange.goto(recordIndex, recordIndex + 1);
            me.syncTop();
            me.ensureFocus();
            me.activeLocation.fireEditEvent('beginedit', me);
        } else {
            if (activeLocation && !destroying) {
                activeLocation.fireEditEvent('canceledit', me);
            }
            me.activeLocation = me.activeRange = Ext.destroy(activeRange);
            if (!destroying) {
                me.setHidden(true);
            }
        }
    },
    onAdded: function(parent) {
        var grids = parent.visibleGrids,
            config, flex, grid, i;
        if (parent.isLockedGrid) {
            for (i = 0; i < grids.length; ++i) {
                grid = grids[i];
                flex = grid.getFlex();
                config = flex ? {
                    flex: flex
                } : {
                    width: grid.getWidth()
                };
                this.trackGrid(grid, config);
            }
        } else {
            this.trackGrid(parent, {
                flex: 1
            });
        }
    },
    onEnd: function() {
        this.gotoRecord(this.grid.store.getCount() - 1);
    },
    onHome: function() {
        this.gotoRecord(0);
    },
    onNextRecord: function() {
        this.gotoRecord(this.recordIndex + 1);
    },
    onPageDown: function() {
        this.advancePage(1);
    },
    onPageUp: function() {
        this.advancePage(-1);
    },
    onPrevRecord: function() {
        this.gotoRecord(this.recordIndex - 1);
    },
    onResize: function(width, height) {
        this.$height = height;
        this.syncTop();
        this.syncWidth();
    },
    onSaveAndNext: function() {
        var me = this,
            store = me.grid.store,
            nextRecordIndex = me.recordIndex + 1;
        if (me.saveChanges(true)) {
            if (nextRecordIndex < store.getCount()) {
                me.plugin.startEdit(store.getAt(nextRecordIndex));
            } else {
                me.hide();
            }
        }
    },
    onStoreRefresh: function() {
        this.cancel();
    },
    adjustButtons: function(buttons, oldButtons) {
        return this.normalizeButtonBar(buttons, oldButtons, null, this.getButtonContainer());
    },
    advancePage: function(delta) {
        var me = this,
            grid = me.plugin.pickGrid(),
            store = grid.store,
            pageSize = Math.floor(grid.getVisibleHeight() / grid.rowHeight),
            recordIndex = me.recordIndex + pageSize * delta;
        recordIndex = Math.max(0, Math.min(recordIndex, store.getCount() - 1));
        me.gotoRecord(recordIndex);
    },
    beforeEdit: function(location) {
        var me = this,
            plugin = me.plugin,
            rec = me.getRecord(),
            phantom = rec && rec.phantom,
            autoConfirm = plugin.$autoConfirm,
            dirty = me.isDirty(),
            ret = true,
            keep, message;
        if (rec === location.record) {
            return false;
        }
        if (rec && me.isVisible() && (phantom || dirty)) {
            if (phantom) {
                autoConfirm = dirty ? autoConfirm.populated : autoConfirm.new;
            } else {
                autoConfirm = autoConfirm.updated;
            }
            if (!autoConfirm) {
                ret = false;
                message = plugin.getDirtyText();
                if (message) {
                    Ext.toast(message);
                }
            } else if (autoConfirm === true) {
                keep = true;
            }
            if (ret) {
                if (location.beforeEdit(me) === false) {
                    ret = false;
                } else if (keep) {
                    ret = me.saveChanges();
                }
            }
        } else if (location.beforeEdit(me) === false) {
            ret = false;
        }
        return ret;
    },
    gotoRecord: function(recordIndex) {
        var me = this,
            store = me.grid.store;
        if (recordIndex >= 0 && recordIndex < store.getCount()) {
            me.plugin.startEdit(store.getAt(recordIndex));
        }
    },
    startEdit: function(location) {
        var me = this,
            copy;
        me.activeLocation = copy = location.clone();
        copy.editor = me;
        me.setRecord(location.record);
        if (me.getHidden()) {
            me.show();
            me.ensureFocus();
        }
    },
    privates: {
        commit: function() {
            this.eachBar('commit');
        },
        eachBar: function(method, args) {
            var items = this.items,
                fn = typeof method === 'function',
                i, item, n, ret;
            items = items && items.items;
            if (fn) {
                args = args ? args.slice() : [];
                args.unshift(null);
            }
            for (i = 0 , n = items && items.length; i < n; ++i) {
                item = items[i];
                if (item.isRowEditorBar) {
                    if (fn) {
                        args[0] = item;
                        ret = method.apply(null, args);
                    } else {
                        ret = item[method].apply(item, args);
                    }
                    if (ret === false) {
                        break;
                    }
                }
            }
            return ret;
        },
        ensureFocus: function() {
            var me = this,
                field;
            if (me.rendered && !me.getHidden()) {
                me.eachBar('flushSyncColumns');
                field = me.down(':focusable:not(button)');
                if (field) {
                    field.focus();
                }
            }
        },
        getPositionedItemTarget: function() {
            return this.el;
        },
        saveChanges: function(commit) {
            var me = this,
                ret = me.isValid(),
                activeLocation, changes, message;
            if (ret) {
                changes = me.getChanges();
                if (changes) {
                    me.getRecord().set(changes);
                }
                activeLocation = me.activeLocation;
                activeLocation.commit = commit;
                activeLocation.fireEditEvent('edit', me);
                if (activeLocation.commit) {
                    me.commit();
                }
                activeLocation.commit = null;
            } else {
                message = me.plugin.getInvalidToastMessage();
                if (message) {
                    Ext.toast(message);
                }
            }
            return ret;
        },
        syncBtnTop: function() {
            var me = this,
                el = me.el,
                buttonsCt = me.getButtons(),
                buttonsBodyEl = buttonsCt.bodyElement,
                buttonsEl = buttonsCt.el,
                buttonCtHeight = buttonsEl.measure('h'),
                plugin = me.plugin,
                ownerGrid = plugin.grid,
                grid = plugin.pickGrid(),
                top = me.getTop(),
                height = me.$height,
                delta = el.getBorderWidth('tb'),
                btnTop, cls;
            if (ownerGrid.isLockedGrid) {
                top -= grid.getHeaderContainer().measure('h');
            }
            if (top + height + buttonCtHeight < grid.getVisibleHeight()) {
                btnTop = height - delta - buttonsEl.getBorderWidth('t') - buttonsBodyEl.getBorderWidth('t');
                cls = '-below';
            } else {
                btnTop = buttonsEl.getBorderWidth('b') + buttonsBodyEl.getBorderWidth('b') - buttonCtHeight + delta;
                cls = '-above';
            }
            me.setCls(me.buttonCtCls + cls);
            buttonsEl.setTop(btnTop);
        },
        syncTop: function() {
            var me = this,
                plugin = me.plugin,
                grid = plugin.pickGrid(),
                ownerGrid = plugin.grid,
                height = me.$height,
                record = me.getRecord(),
                minTop = 0,
                decoration, item, maxTop, top, visibleHeight, visibleTop;
            if (record) {
                item = grid.mapToItem(record);
                maxTop = visibleHeight = grid.getVisibleHeight();
                visibleTop = grid.getScrollable().getPosition().y;
                if (ownerGrid.getHorizontalOverflow()) {
                    maxTop -= Ext.scrollbar.height();
                }
                if (!grid.infinite) {}
                else if (item) {
                    top = item.$y0 - visibleTop;
                } else {
                    top = (me.recordIndex < grid.getTopRenderedIndex()) ? 0 : visibleHeight;
                }
                if (grid.isGrouping()) {
                    decoration = grid.getPinnedHeader();
                    if (decoration && decoration.$height) {
                        minTop = decoration.$height;
                    }
                    decoration = grid.getPinnedFooter();
                    if (decoration && decoration.$height) {
                        maxTop -= decoration.$height;
                    }
                }
                top = Math.max(minTop, Math.min(top, maxTop - (height || 0)));
                if (ownerGrid.isLockedGrid) {
                    top += grid.getHeaderContainer().measure('h');
                }
                me.setTop(top);
                if (height != null) {
                    me.syncBtnTop();
                }
            }
        },
        syncWidth: function() {
            this.setRight(this.grid.getVerticalOverflow() ? Ext.scrollbar.width() : 0);
        },
        trackGrid: function(grid, config) {
            this.add(Ext.apply({
                grid: grid,
                plugin: this.plugin,
                record: this.getRecord()
            }, config));
        },
        unanimated: function() {
            var me = this,
                cls = Ext.baseCSSPrefix + 'no-transition';
            me.addCls(cls);
            Ext.defer(function() {
                if (!me.destroyed) {
                    me.removeCls(cls);
                }
            }, 50);
            return me;
        }
    }
});

Ext.define('Ext.grid.rowedit.Gap', {
    extend: Ext.Component,
    xtype: 'roweditorgap',
    isRowEditorGap: true,
    isRowEditorItem: true,
    cls: Ext.baseCSSPrefix + 'roweditorgap'
});

Ext.define('Ext.grid.rowedit.Plugin', {
    extend: Ext.plugin.Abstract,
    alias: 'plugin.rowedit',
    config: {
        dirtyText: 'You need to commit or cancel your changes',
        editor: {
            lazy: true,
            $value: {
                xtype: 'roweditor'
            }
        },
        invalidToastMessage: 'Cannot save invalid data',
        triggerEvent: 'doubletap',
        grid: null
    },
    cachedConfig: {
        autoConfirm: 'discard',
        buttons: {
            ok: {
                iconCls: 'fi-check',
                text: null,
                handler: 'up.saveAndClose',
                tooltip: 'Save changes and close editor'
            },
            cancel: {
                iconCls: 'fi-times',
                text: null,
                handler: 'up.cancel',
                tooltip: 'Close editor, discarding any changes'
            },
            reset: {
                iconCls: 'fi-refresh',
                text: null,
                handler: 'up.resetChanges',
                margin: '0 0 0 8',
                tooltip: 'Reset editor to initially displayed values',
                weight: 200
            },
            revert: {
                iconCls: 'fi-undo',
                text: null,
                handler: 'up.revertChanges',
                margin: '0 0 0 8',
                tooltip: 'Reset editor to record\'s original values',
                weight: 210
            }
        },
        confirmation: {
            reset: 'Are you sure you want to discard the current edits?',
            revert: 'Are you sure you want to revert all edits to this record?'
        },
        adapters: {
            "default": {
                xtype: 'roweditorcell'
            },
            checkcell: {
                xtype: 'checkbox',
                isRowEditorCell: true,
                bodyAlign: 'center',
                label: null,
                $hasValue: true
            },
            rownumberercell: {
                driver: 'rownumber'
            },
            expandercell: null,
            widgetcell: null
        },
        drivers: {
            "default": {
                prop: 'value',
                commit: function(item) {
                    item.resetOriginalValue();
                },
                convert: Ext.identityFn,
                get: function(item) {
                    return item.getValue();
                },
                reset: function(item) {
                    item.reset();
                },
                set: function(item, value) {
                    if (item.forceSetValue) {
                        item.forceSetValue(value);
                    } else {
                        item.setValue(value);
                    }
                }
            },
            checkbox: {
                prop: 'checked',
                convert: function(value) {
                    return !!value;
                },
                get: function(item) {
                    return item.getChecked();
                },
                set: function(item, value) {
                    item.setChecked(value);
                }
            },
            rownumber: {
                read: function(record, col, editBar) {
                    return col.printValue(editBar.parent.recordIndex + 1);
                }
            },
            roweditorcell: {
                prop: 'html',
                commit: Ext.emptyFn,
                convert: function(value, col) {
                    return Ext.htmlEncode(col.printValue(value));
                },
                get: function(item) {
                    return Ext.htmlDecode(item.getHtml());
                },
                reset: Ext.emptyFn,
                set: function(item, value) {
                    item.setHtml(this.convert(value, item.getColumn()));
                }
            }
        }
    },
    editing: false,
    constructor: function(config) {
        this.callParent([
            config || {}
        ]);
    },
    init: function(grid) {
        this.callParent([
            grid
        ]);
        this.setGrid(grid);
    },
    doDestroy: function() {
        this.editing = false;
        this.setEditor(null);
        this.setGrid(null);
        this.callParent();
    },
    cancelEdit: function() {
        if (this.editing) {
            this.getEditor().cancel();
        }
    },
    completeEdit: function() {
        if (this.editing) {
            this.getEditor().saveAndClose();
        }
    },
    startEdit: function(record, column) {
        var me = this,
            editor = me.getEditor(),
            location = record;
        if (!location.isLocation) {
            location = me.grid.createLocation({
                record: record,
                column: column
            });
        }
        me.grid.ensureVisible(location.record);
        if (location.record && editor.beforeEdit(location) !== false) {
            editor.startEdit(location);
            return true;
        }
        return false;
    },
    updateAutoConfirm: function(value) {
        var full;
        if (!Ext.isObject(value)) {
            full = {
                "new": value,
                populated: value,
                updated: value
            };
        } else {
            full = Ext.apply({}, value);
            if (!('updated' in full)) {
                full.updated = 'discard';
            }
            if (!('new' in full)) {
                full.new = full.updated;
            }
            if (!('populated' in full)) {
                full.populated = full.new;
            }
        }
        Ext.each([
            'new',
            'populated',
            'updated'
        ], function(key) {
            var v = full[key];
            if (typeof v !== 'boolean' && v !== 'discard') {
                Ext.raise('Invalid autoConfirm' + (Ext.isObject(value) ? '.' + key : '') + ' value "' + v + '"');
            }
        });
        this.$autoConfirm = full;
    },
    applyEditor: function(config, existing) {
        return Ext.updateWidget(existing, config, this, 'createEditor');
    },
    createEditor: function(config) {
        var grid = this.getGrid();
        return Ext.apply({
            $initParent: grid,
            owner: grid,
            parent: grid,
            plugin: this,
            hidden: true,
            buttons: this.getButtons(),
            left: 0,
            right: 0,
            top: 0
        }, config);
    },
    updateEditor: function(editor) {
        this.editor = editor;
        if (editor) {
            this.getGrid().add(editor);
        }
    },
    updateGrid: function(grid, oldGrid) {
        var me = this;
        me.grid = grid;
        if (oldGrid && !oldGrid.destroying) {
            oldGrid.unregisterActionable(this);
        }
        if (grid) {
            grid.registerActionable(this);
        }
    },
    activateCell: function(location) {
        this.startEdit(location);
    },
    pickGrid: function() {
        var grid = this.grid;
        if (grid.isLockedGrid) {
            grid = grid.regionMap.center.getGrid();
        }
        return grid;
    }
});

Ext.define('Ext.menu.Separator', {
    extend: Ext.Component,
    xtype: 'menuseparator',
    isMenuSeparator: true,
    focusable: false,
    classCls: Ext.baseCSSPrefix + 'menuseparator',
    ariaRole: 'separator'
});

Ext.define('Ext.exporter.Plugin', {
    extend: Ext.plugin.Abstract,
    alias: [
        'plugin.exporterplugin'
    ],
    init: function(cmp) {
        var me = this;
        cmp.saveDocumentAs = Ext.bind(me.saveDocumentAs, me);
        cmp.getDocumentData = Ext.bind(me.getDocumentData, me);
        me.cmp = cmp;
        return me.callParent([
            cmp
        ]);
    },
    destroy: function() {
        var me = this,
            cmp = me.cmp;
        cmp.saveDocumentAs = cmp.getDocumentData = me.cmp = me.delayedSaveTimer = Ext.unasap(me.delayedSaveTimer);
        me.callParent();
    },
    saveDocumentAs: function(config) {
        var cmp = this.cmp,
            deferred = new Ext.Deferred(),
            exporter = this.getExporter(config);
        cmp.fireEvent('beforedocumentsave', cmp, {
            config: config,
            exporter: exporter
        });
        this.delayedSaveTimer = Ext.asap(this.delayedSave, this, [
            exporter,
            config,
            deferred
        ]);
        return deferred.promise;
    },
    delayedSave: function(exporter, config, deferred) {
        var cmp = this.cmp;
        if (this.disabled || !cmp) {
            Ext.destroy(exporter);
            deferred.reject();
            return;
        }
        this.setExporterData(exporter, config);
        exporter.saveAs().then(function() {
            deferred.resolve(config);
        }, function(msg) {
            deferred.reject(msg);
        }).always(function() {
            var canFire = cmp && !cmp.destroyed;
            if (canFire) {
                cmp.fireEvent('documentsave', cmp, {
                    config: config,
                    exporter: exporter
                });
            }
            Ext.destroy(exporter);
            if (canFire) {
                cmp.fireEvent('exportfinished', cmp, {
                    config: config
                });
            }
        });
    },
    getDocumentData: function(config) {
        var exporter, ret;
        if (this.disabled) {
            return;
        }
        exporter = this.getExporter(config);
        this.setExporterData(exporter, config);
        ret = exporter.getContent();
        Ext.destroy(exporter);
        return ret;
    },
    getExporter: function(config) {
        var cfg = Ext.apply({
                type: 'excel'
            }, config);
        return Ext.Factory.exporter(cfg);
    },
    setExporterData: function(exporter, config) {
        var cmp = this.cmp;
        exporter.setData(this.prepareData(config));
        cmp.fireEvent('dataready', cmp, {
            config: config,
            exporter: exporter
        });
    },
    getExportStyle: function(style, config) {
        var type = (config && config.type),
            types, def, index;
        if (Ext.isArray(style)) {
            types = Ext.Array.pluck(style, 'type');
            index = Ext.Array.indexOf(types, undefined);
            if (index >= 0) {
                def = style[index];
            }
            index = Ext.Array.indexOf(types, type);
            return index >= 0 ? style[index] : def;
        } else {
            return style;
        }
    },
    prepareData: Ext.emptyFn
});

Ext.define('Ext.grid.plugin.BaseExporter', {
    extend: Ext.exporter.Plugin,
    prepareData: function(config) {
        var me = this,
            store = me.cmp.getStore(),
            table = new Ext.exporter.data.Table(),
            result, columns;
        result = me.getColumnHeaders(config, me.getGridColumns());
        table.setColumns(result.headers);
        if (!store || (store && store.destroyed)) {
            return table;
        }
        if (store && store.isBufferedStore) {
            Ext.raise("BufferedStore can't be exported because it doesn't have all data available");
        }
        columns = me.prepareDataIndexColumns(config, result.dataIndexes);
        if (store.isTreeStore) {
            me.extractNodeData(config, table, columns, store.getRoot());
        } else {
            if (config && config.includeGroups && store.isGrouped()) {
                me.extractData(config, table, columns, store.getGroups());
                me.extractSummaryRow(config, table, columns, store);
            } else {
                me.extractRows(config, table, columns, store);
            }
        }
        return table;
    },
    getColumnHeaders: function(config, columns) {
        var cols = [],
            dataIndexes = [],
            len = columns.length,
            i, result;
        for (i = 0; i < len; i++) {
            result = this.getColumnHeader(config, columns[i]);
            if (result) {
                cols.push(result.header);
                Ext.Array.insert(dataIndexes, dataIndexes.length, result.dataIndexes);
            }
        }
        return {
            headers: cols,
            dataIndexes: dataIndexes
        };
    },
    getGridColumns: function() {
        return [];
    },
    getColumnHeader: Ext.emptyFn,
    prepareDataIndexColumns: function(config, dataIndexes) {
        var len = dataIndexes.length,
            columns = [],
            i;
        for (i = 0; i < len; i++) {
            columns.push(this.prepareDataIndexColumn(config, dataIndexes[i]));
        }
        return columns;
    },
    prepareDataIndexColumn: function(config, column) {
        return {
            column: column,
            fn: Ext.emptyFn
        };
    },
    extractData: function(config, group, columns, collection) {
        var i, len, children, storeGroup, tableGroup;
        if (!collection) {
            return;
        }
        len = collection.getCount();
        for (i = 0; i < len; i++) {
            storeGroup = collection.getAt(i);
            children = storeGroup.getGroups();
            tableGroup = group.addGroup({
                text: storeGroup.getGroupKey()
            });
            if (children) {
                this.extractData(config, tableGroup, columns, children);
            } else {
                this.extractRows(config, tableGroup, columns, storeGroup);
            }
        }
    },
    extractNodeData: function(config, group, columns, node) {
        var me = this,
            store = me.cmp.getStore(),
            lenCols = columns.length,
            i, j, record, row, cell, column, children, len;
        if (node && node.hasChildNodes()) {
            children = node.childNodes;
            len = children.length;
            for (i = 0; i < len; i++) {
                record = children[i];
                row = {
                    cells: []
                };
                for (j = 0; j < lenCols; j++) {
                    column = columns[j];
                    cell = me.getCell(store, record, column) || {
                        value: null
                    };
                    if (column.column.isTreeColumn && cell) {
                        cell.style = Ext.merge(cell.style || {}, {
                            alignment: {
                                indent: record.getDepth() - 1
                            }
                        });
                    }
                    row.cells.push(cell);
                }
                group.addRow(row);
                if (record.hasChildNodes()) {
                    me.extractNodeData(config, group, columns, record);
                }
            }
        }
    },
    extractRows: function(config, group, columns, collection) {
        var cmp = this.cmp,
            store = cmp.getStore(),
            len = collection.getCount(),
            lenCols = columns.length,
            rows = [],
            i, j, record, row, cell;
        for (i = 0; i < len; i++) {
            record = collection.getAt(i);
            row = {
                cells: []
            };
            for (j = 0; j < lenCols; j++) {
                cell = this.getCell(store, record, columns[j]);
                row.cells.push(cell || {
                    value: null
                });
            }
            rows.push(row);
        }
        group.setRows(rows);
        this.extractSummaryRow(config, group, columns, collection);
    },
    extractSummaryRow: function(config, group, columns, collection) {
        var lenCols = columns.length,
            i, record, row, cell;
        if (config.includeSummary) {
            row = {
                cells: []
            };
            record = this.getSummaryRecord(collection, columns);
            for (i = 0; i < lenCols; i++) {
                cell = this.getSummaryCell(collection, record, columns[i]);
                row.cells.push(cell || {
                    value: null
                });
            }
            group.setSummaries(row);
        }
    },
    getCell: Ext.emptyFn,
    getSummaryCell: Ext.emptyFn,
    getSummaryRecord: function(collection, columns) {
        var len = columns.length,
            summaryRecord = collection.getSummaryRecord(),
            record = new Ext.data.Model({
                id: 'summary-record'
            }),
            i, colDef, records;
        record.beginEdit();
        record.set(summaryRecord.getData());
        for (i = 0; i < len; i++) {
            colDef = columns[i];
            if (colDef.summary) {
                records = collection.isStore ? collection.data.items.slice() : collection.items.slice();
                record.set(colDef.summaryIndex, colDef.summary.calculate(records, colDef.summaryIndex, 'data', 0, records.length));
            } else if (colDef.summaryType) {
                record.set(colDef.summaryIndex, this.getSummary(collection, colDef.summaryType, colDef.summaryIndex));
            }
        }
        record.endEdit();
        record.commit(true);
        return record;
    },
    getSummary: function(item, type, field) {
        var isStore = item.isStore;
        if (type) {
            if (Ext.isFunction(type)) {
                if (isStore) {
                    return item.aggregate(type, null, false, [
                        field
                    ]);
                } else {
                    return item.aggregate(field, type);
                }
            }
            switch (type) {
                case 'count':
                    return item.count();
                case 'min':
                    return item.min(field);
                case 'max':
                    return item.max(field);
                case 'sum':
                    return item.sum(field);
                case 'average':
                    return item.average(field);
                default:
                    return null;
            }
        }
    }
});

Ext.define('Ext.grid.plugin.Exporter', {
    alias: [
        'plugin.gridexporter'
    ],
    extend: Ext.grid.plugin.BaseExporter,
    getGridColumns: function() {
        return this.cmp.getHeaderContainer().innerItems;
    },
    getColumnHeader: function(config, column) {
        var dataIndexes = [],
            obj, result, style;
        obj = {
            text: column.getText(),
            width: column.getWidth()
        };
        if (column.isHeaderGroup) {
            result = this.getColumnHeaders(config, column.innerItems);
            obj.columns = result.headers;
            if (obj.columns.length === 0) {
                obj = null;
            } else {
                Ext.Array.insert(dataIndexes, dataIndexes.length, result.dataIndexes);
            }
        } else if (!column.getHidden() && !column.getIgnoreExport()) {
            style = this.getExportStyle(column.getExportStyle(), config);
            obj.style = style;
            obj.width = obj.width || column.getComputedWidth();
            if (style) {
                obj.width = style.width || obj.width;
            }
            dataIndexes.push(column);
        } else {
            obj = null;
        }
        if (obj) {
            return {
                header: obj,
                dataIndexes: dataIndexes
            };
        }
    },
    prepareDataIndexColumn: function(config, column) {
        var fn = Ext.identityFn,
            summaryFn = Ext.identityFn,
            style = this.getExportStyle(column.getExportStyle(), config);
        if (!style || (style && !style.format)) {
            fn = this.getSpecialFn({
                renderer: 'renderer',
                exportRenderer: 'exportRenderer',
                formatter: 'formatter'
            }, column) || fn;
            summaryFn = this.getSpecialFn({
                renderer: 'summaryRenderer',
                exportRenderer: 'exportSummaryRenderer',
                formatter: 'summaryFormatter'
            }, column) || fn;
        }
        return {
            dataIndex: column.getDataIndex(),
            column: column,
            fn: fn,
            summary: column.getSummary(),
            summaryType: column.getSummaryType(),
            summaryIndex: column.getSummaryDataIndex() || column.getDataIndex(),
            summaryFn: summaryFn
        };
    },
    getSpecialFn: function(names, column) {
        var exportRenderer = column['get' + Ext.String.capitalize(names.exportRenderer)](),
            renderer = column['get' + Ext.String.capitalize(names.renderer)](),
            formatter = column['get' + Ext.String.capitalize(names.formatter)](),
            fn, scope, tempFn;
        scope = column.getScope() || column.resolveListenerScope() || column;
        tempFn = exportRenderer;
        if (formatter && !tempFn) {
            fn = formatter;
        } else {
            if (tempFn === true) {
                tempFn = renderer;
            }
            if (typeof tempFn === 'string') {
                fn = function() {
                    return Ext.callback(tempFn, scope, arguments, 0, column);
                };
            } else if (typeof tempFn === 'function') {
                fn = function() {
                    return tempFn.apply(scope, arguments);
                };
            }
        }
        return fn;
    },
    getCell: function(store, record, colDef) {
        var dataIndex = colDef.dataIndex,
            v = record.get(dataIndex);
        return {
            value: colDef.fn(v, record, dataIndex, null, colDef.column)
        };
    },
    getSummaryCell: function(collection, record, colDef) {
        var dataIndex = colDef.summaryIndex,
            v = record.get(dataIndex);
        return {
            value: colDef.summaryFn(v, record, dataIndex, null, colDef.column)
        };
    }
});

Ext.define('Ext.grid.Tree', {
    extend: Ext.grid.Grid,
    xtype: 'tree',
    alternateClassName: 'Ext.tree.Tree',
    classCls: Ext.baseCSSPrefix + 'tree',
    expanderLastCls: Ext.baseCSSPrefix + 'expander-last',
    expanderFirstCls: Ext.baseCSSPrefix + 'expander-first',
    expanderOnlyCls: Ext.baseCSSPrefix + 'expander-only',
    cellExpanderCls: Ext.baseCSSPrefix + 'cell-expander',
    cachedConfig: {
        expanderFirst: true,
        expanderOnly: true
    },
    config: {
        root: {},
        selectOnExpander: false,
        singleExpand: false,
        rootVisible: true,
        displayField: 'text',
        columns: false,
        rowLines: false,
        folderSort: false
    },
    eventsSelector: '.' + Ext.baseCSSPrefix + 'grid-cell',
    applyColumns: function(columns) {
        if (!columns) {
            this.setHideHeaders(true);
            columns = [
                {
                    xtype: 'treecolumn',
                    text: 'Name',
                    dataIndex: this.getDisplayField(),
                    minWidth: 100,
                    flex: 1
                }
            ];
        }
        return columns;
    },
    onRootChange: function(newRoot, oldRoot) {
        var me = this,
            fireEventArgs;
        if (oldRoot) {
            delete oldRoot.fireEventArgs;
        }
        if (newRoot) {
            fireEventArgs = newRoot.fireEventArgs;
            newRoot.fireEventArgs = function(eventName) {
                var ret = fireEventArgs.apply(newRoot, arguments);
                if (ret !== false) {
                    arguments[0] = me.rootEventsMap[eventName] || ('item' + eventName);
                    ret = me.fireEventArgs.apply(me, arguments);
                }
                return ret;
            };
        }
    },
    updateExpanderFirst: function(expanderFirst) {
        var el = this.element;
        el.toggleCls(this.expanderFirstCls, expanderFirst);
        el.toggleCls(this.expanderLastCls, !expanderFirst);
    },
    updateExpanderOnly: function(expanderOnly) {
        var el = this.element;
        el.toggleCls(this.expanderOnlyCls, expanderOnly);
        el.toggleCls(this.cellExpanderCls, !expanderOnly);
    },
    setRootNode: function(root) {
        var store = this.getStore();
        root = store.setRoot(root);
        return root;
    },
    getRootNode: function() {
        var store = this.getStore();
        return store ? store.getRoot() : null;
    },
    expandNode: function(record, deep, callback, scope) {
        return record.expand(deep, callback, scope || this);
    },
    collapseNode: function(record, deep, callback, scope) {
        return record.collapse(deep, callback, scope || this);
    },
    expandAll: function(callback, scope) {
        var me = this,
            root = me.getRootNode();
        if (root) {
            Ext.suspendLayouts();
            root.expand(true, callback, scope || me);
            Ext.resumeLayouts(true);
        }
    },
    collapseAll: function(callback, scope) {
        var me = this,
            root = me.getRootNode();
        if (root) {
            Ext.suspendLayouts();
            scope = scope || me;
            if (me.getStore().rootVisible) {
                root.collapse(true, callback, scope);
            } else {
                root.collapseChildren(true, callback, scope);
            }
            Ext.resumeLayouts(true);
        }
    },
    getChecked: function() {
        var checked = [],
            rootNode = this.getRootNode(),
            isChecked = rootNode.get('checked'),
            childNodes = rootNode.childNodes;
        if (isChecked === true) {
            checked.push(rootNode);
        }
        this.getCheckedChildItems(childNodes, checked);
        return checked;
    },
    privates: {
        rootEventsMap: {
            beforeappend: 'beforeitemappend',
            beforeremove: 'beforeritememove',
            beforemove: 'beforeitemmove',
            beforeinsert: 'beforeiteminsert',
            beforeexpand: 'beforeitemexpand',
            beforecollapse: 'beforeitemcollapse'
        },
        doChildTouchStart: function(location) {
            var cell = location.cell;
            if (cell && (!cell.isTreeCell || this.getSelectOnExpander() || location.event.target !== cell.expanderElement.dom)) {
                this.callParent([
                    location
                ]);
            }
        },
        updateStore: function(newStore, oldStore) {
            var me = this,
                newRoot;
            if (oldStore) {
                Ext.destroy(me.storeListeners, me.storeRelayers);
            }
            if (newStore) {
                me.store = newStore;
                newRoot = newStore.getRoot();
                if (newRoot) {
                    me.onRootChange(newRoot);
                } else {
                    newStore.setRoot(me.getRoot());
                    newRoot = newStore.getRoot();
                }
                if (!('rootVisible' in newStore.initialConfig)) {
                    newStore.setRootVisible(me.getRootVisible());
                }
                newStore.ownerTree = me;
                me.callParent([
                    newStore,
                    oldStore
                ]);
                newStore.folderSort = me.getFolderSort();
                me.storeListeners = me.mon(newStore, {
                    destroyable: true,
                    rootchange: me.onRootChange,
                    scope: me
                });
                me.storeRelayers = me.relayEvents(newStore, [
                    'beforeload',
                    'load'
                ]);
                if (!newStore.rootVisible && !newStore.autoLoad && !(newRoot.isExpanded() || newRoot.isLoading())) {
                    if (newRoot.isLoaded()) {
                        newRoot.data.expanded = true;
                        newStore.onNodeExpand(newRoot, newRoot.childNodes);
                    }
                    else if (newStore.autoLoad !== false && !newStore.hasPendingLoad()) {
                        newRoot.data.expanded = false;
                        newRoot.expand();
                    }
                }
            }
        },
        getCheckedChildItems: function(childNodes, checked) {
            var i, childNode;
            for (i = 0; i < childNodes.length; i++) {
                childNode = childNodes[i];
                if (childNode.get('checked') === true) {
                    checked.push(childNode);
                }
                if (childNode.childNodes.length) {
                    this.getCheckedChildItems(childNode.childNodes, checked);
                }
            }
        }
    }
});

Ext.define('Ext.grid.TreeDragZone', {
    extend: Ext.grid.GridDragZone,
    beforeDragStart: function(info) {
        var targetCmp = Ext.dd.Manager.getTargetComp(info),
            record = targetCmp.getRecord();
        if (record.isRoot()) {
            return false;
        }
        this.callParent([
            info
        ]);
    },
    getDragData: function(e) {
        var view = this.view,
            cell = Ext.Component.from(e, view),
            selections, record, selectionIndex, store, rootIndex, dragRecords;
        record = cell.getRecord();
        store = record.getTreeStore();
        selections = view.getSelections();
        if (selections) {
            selectionIndex = selections.indexOf(record);
            record = (selectionIndex !== -1) ? selections : record;
        }
        dragRecords = Ext.Array.from(record);
        rootIndex = record.indexOf(store.getRoot());
        if (rootIndex !== -1) {
            dragRecords = Ext.Array.removeAt(dragRecords, rootIndex, 0);
        }
        return {
            eventTarget: e,
            view: view,
            item: cell,
            records: dragRecords
        };
    },
    getDragText: function(info) {
        var dragText = this.dragText,
            data = info.data.dragData,
            count = data.records.length,
            record;
        if (Ext.isFunction(dragText)) {
            return dragText(count, info);
        }
        if (count === 1) {
            record = Ext.dd.Manager.getTargetComp(info).getRecord();
            return record.get(this.view.getDisplayField()) || '';
        }
        return Ext.String.format(dragText, count, count === 1 ? '' : Ext.util.Inflector.pluralize(''));
    }
});

Ext.define('Ext.grid.TreeDropZone', {
    extend: Ext.grid.GridDropZone,
    expandNode: function(node) {
        if (!node.isExpanded()) {
            node.expand();
            if (this.ddEl) {
                this.ddEl.removeCls(this.dropMarkerCls + '-after');
            }
        }
        this.timerId = null;
    },
    cancelExpand: function() {
        this.timerId = Ext.undefer(this.timerId);
    },
    isTargetValid: function(draggedData, targetRecord, highlight) {
        var ln = draggedData.length,
            count = 0,
            i, record;
        for (i = 0; i < draggedData.length; i++) {
            record = draggedData[i];
            if (record.contains(targetRecord)) {
                return false;
            }
            if ((record.parentNode === targetRecord) && (highlight !== 'before' || targetRecord.isRoot())) {
                ++count;
            }
        }
        return count < ln ? true : false;
    },
    onDragMove: function(info) {
        var me = this,
            ddManager = Ext.dd.Manager,
            targetCmp = ddManager.getTargetComp(info),
            addDropMarker = true,
            highlight, isValidTargetNode, ddRecords, isSameGroup, isValidTarget, targetRecord, positionCls;
        highlight = ddManager.getPosition(info, targetCmp);
        positionCls = me.dropMarkerCls + '-' + highlight;
        if (!targetCmp || targetCmp.hasCls(positionCls)) {
            return;
        }
        if (targetCmp.getRecord) {
            targetRecord = targetCmp.getRecord();
        }
        isSameGroup = Ext.Array.intersect(me.getGroups(), info.source.getGroups()).length;
        if (!targetRecord || !isSameGroup) {
            if (me.ddEl) {
                me.removeDropMarker();
            }
            return;
        }
        ddRecords = info.data.dragData.records;
        isValidTarget = ddRecords.indexOf(targetRecord) === -1;
        isValidTargetNode = me.isTargetValid(ddRecords, targetRecord, highlight);
        if (!isValidTarget || !isValidTargetNode) {
            if (me.ddEl) {
                me.removeDropMarker();
            }
            return;
        }
        if (me.ddEl) {
            me.removeDropMarker();
        }
        me.cancelExpand();
        me.ddEl = targetCmp;
        if (!targetRecord.isLeaf()) {
            addDropMarker = false;
            ddManager.toggleProxyCls(info, me.validDropCls, true);
            if ((!targetRecord.isExpanded() && highlight === 'after') || (!targetRecord.isRoot() && highlight === 'before')) {
                addDropMarker = true;
            }
            if (highlight === 'after' && me.allowExpandOnHover) {
                me.timerId = Ext.defer(me.expandNode, me.expandDelay, me, [
                    targetRecord
                ]);
            }
        }
        if (addDropMarker) {
            me.addDropMarker(targetCmp, [
                me.dropIndicator,
                positionCls
            ]);
        }
    },
    arrangeNode: function(node, records, args, action) {
        var ln = records.length,
            i;
        for (i = 0; i < ln; i++) {
            args[0] = records[i];
            node[action].apply(node, args);
        }
        this.view.ensureVisible(records[0]);
    },
    onNodeDrop: function(dragInfo) {
        var me = this,
            targetNode = dragInfo.targetNode,
            draggedData = dragInfo.draggedData,
            records = draggedData.records,
            len = records.length,
            targetRecord = dragInfo.targetRecord,
            position = dragInfo.position,
            isRoot = targetRecord.isRoot(),
            parentNode = targetRecord.parentNode || me.view.getRootNode(),
            action = 'appendChild',
            args = [
                null
            ],
            i, nextSibling, selectable, selModel;
        if (me.copy) {
            for (i = 0; i < len; i++) {
                records[i] = records[i].copy(undefined, true, true);
            }
        }
        if (position === 'before') {
            if (!isRoot) {
                action = 'insertBefore';
                args = [
                    null,
                    targetRecord
                ];
            }
        } else if (position === 'after') {
            nextSibling = targetRecord.nextSibling;
            if (isRoot || !targetRecord.isLeaf()) {
                parentNode = targetRecord;
            } else if (nextSibling) {
                if (targetRecord.isLeaf()) {
                    args = [
                        null,
                        nextSibling
                    ];
                    action = 'insertBefore';
                } else {
                    parentNode = targetRecord;
                }
            }
        }
        me.arrangeNode(parentNode, records, args, action);
        selectable = me.view.getSelectable();
        selModel = selectable.getSelection().getSelectionModel();
        selModel.select(records);
        me.view.fireEvent('drop', targetNode, draggedData, targetRecord, position);
        delete me.dragInfo;
    },
    confirmDrop: function() {
        Ext.asap(this.onNodeDrop, this, [
            this.dragInfo
        ]);
    },
    prepareRecordBeforeDrop: function(draggedData, targetRecord, highlight) {
        var draggedRecs = draggedData.records,
            records = [],
            ln = draggedRecs.length,
            record, i;
        for (i = 0; i < ln; i++) {
            record = draggedRecs[i];
            if (record.parentNode !== targetRecord || highlight === 'before') {
                records.push(record);
            }
        }
        draggedData.records = records;
        return draggedData;
    },
    onDrop: function(info) {
        var me = this,
            view = me.view,
            targetNode = me.ddEl,
            draggedData, targetRecord, position;
        me.cancelExpand();
        if (!targetNode) {
            return;
        }
        targetRecord = targetNode.getRecord();
        if (!targetRecord.isNode) {
            return;
        }
        draggedData = info.data.dragData;
        position = targetNode.hasCls(me.dropMarkerCls + '-before') ? 'before' : 'after';
        me.prepareRecordBeforeDrop(draggedData, targetRecord, position);
        if (!draggedData.records.length) {
            return;
        }
        if (view.fireEvent('beforedrop', targetNode, draggedData, targetRecord, position) !== false) {
            me.dragInfo = {
                draggedData: draggedData,
                targetRecord: targetRecord,
                position: position,
                targetNode: targetNode
            };
            if (!targetRecord.isExpanded() && position === 'after') {
                targetRecord.expand(undefined, me.confirmDrop, me);
            } else if (targetRecord.isLoading()) {
                targetRecord.on({
                    expand: 'confirmDrop',
                    single: true,
                    scope: me
                });
            } else {
                me.confirmDrop();
            }
        }
        me.removeDropMarker();
    }
});

Ext.define('Ext.grid.cell.Tree', {
    extend: Ext.grid.cell.Cell,
    xtype: 'treecell',
    isTreeCell: true,
    classCls: Ext.baseCSSPrefix + 'treecell',
    collapsedCls: Ext.baseCSSPrefix + 'collapsed',
    expandedCls: Ext.baseCSSPrefix + 'expanded',
    leafCls: Ext.baseCSSPrefix + 'leaf',
    expandableCls: Ext.baseCSSPrefix + 'expandable',
    withIconCls: Ext.baseCSSPrefix + 'with-icon',
    withoutIconCls: Ext.baseCSSPrefix + 'no-icon',
    loadingCls: Ext.baseCSSPrefix + 'loading',
    selectedCls: Ext.baseCSSPrefix + 'selected',
    checkableCls: Ext.baseCSSPrefix + 'treecell-checkable',
    checkedCls: Ext.baseCSSPrefix + 'treecell-checked',
    trimodeCls: Ext.baseCSSPrefix + 'treecell-trimode',
    uncheckedCls: Ext.baseCSSPrefix + 'treecell-unchecked',
    config: {
        iconClsProperty: 'iconCls',
        iconCls: null,
        indent: null,
        text: {
            lazy: true,
            $value: ''
        },
        autoCheckChildren: true,
        checkable: null,
        checkableField: 'checkable',
        checkedField: 'checked',
        checkOnTriTap: true,
        enableTri: true
    },
    element: {
        reference: 'element',
        children: [
            {
                reference: 'innerElement',
                cls: Ext.baseCSSPrefix + 'inner-el',
                children: [
                    {
                        reference: 'indentElement',
                        cls: Ext.baseCSSPrefix + 'indent-el'
                    },
                    {
                        reference: 'expanderElement',
                        cls: Ext.baseCSSPrefix + 'expander-el ' + Ext.baseCSSPrefix + 'font-icon'
                    },
                    {
                        reference: 'checkElement',
                        listeners: {
                            tap: 'onCheckTap'
                        },
                        cls: Ext.baseCSSPrefix + 'check-el ' + Ext.baseCSSPrefix + 'font-icon'
                    },
                    {
                        reference: 'iconElement',
                        cls: Ext.baseCSSPrefix + 'icon-el ' + Ext.baseCSSPrefix + 'font-icon'
                    },
                    {
                        reference: 'bodyElement',
                        cls: Ext.baseCSSPrefix + 'body-el',
                        uiCls: 'body-el'
                    }
                ]
            }
        ]
    },
    toolDefaults: {
        zone: 'tail'
    },
    relayedEvents: [
        'beforecheckchange',
        'checkchange'
    ],
    constructor: function(config) {
        var me = this;
        me.callParent([
            config
        ]);
        me.element.on({
            scope: me,
            tap: 'maybeToggle'
        });
        me.getGrid().relayEvents(me, me.relayedEvents);
    },
    toggle: function() {
        var me = this,
            record = me.getRecord();
        if (record.isExpanded()) {
            me.collapse();
        } else if (record.isExpandable()) {
            me.expand();
        }
    },
    collapse: function() {
        var me = this,
            record = me.getRecord();
        me.getGrid().fireEventedAction('nodecollapse', [
            me.parent,
            record,
            'collapse'
        ], 'doToggle', this);
    },
    expand: function() {
        var me = this,
            record = me.getRecord(),
            tree = me.getGrid(),
            siblings, i, len, sibling;
        tree.fireEventedAction('nodeexpand', [
            me.parent,
            record,
            'expand'
        ], 'doToggle', me);
        if (record.isExpanded && !record.isRoot() && tree.getSingleExpand()) {
            siblings = record.parentNode.childNodes;
            for (i = 0 , len = siblings.length; i < len; ++i) {
                sibling = siblings[i];
                if (sibling !== record) {
                    sibling.collapse();
                }
            }
        }
    },
    refresh: function(ctx) {
        var record;
        this.callParent([
            ctx
        ]);
        record = this.getRecord();
        if (record) {
            this.doNodeUpdate(record);
        }
    },
    updateCheckable: function() {
        this.syncCheckElement();
    },
    updateIconCls: function(iconCls, oldIconCls) {
        var me = this,
            el = me.element,
            noIcon = !iconCls;
        me.iconElement.replaceCls(oldIconCls, iconCls);
        el.toggleCls(me.withIconCls, !noIcon);
        el.toggleCls(me.withoutIconCls, noIcon);
    },
    updateUi: function(ui, oldUi) {
        this.callParent([
            ui,
            oldUi
        ]);
        this._indent = null;
        this.syncIndent();
    },
    syncCheckElement: function() {
        var me = this,
            record = me.getRecord(),
            cellCheckable = me.getCheckable(),
            checkedCls = me.checkedCls,
            trimodeCls = me.trimodeCls,
            uncheckedCls = me.uncheckedCls,
            checkable = null,
            checked = null,
            shouldTri;
        if (record) {
            checkable = record.get(me.getCheckableField());
            checked = record.get(me.getCheckedField());
        }
        if ((cellCheckable && checkable !== false) || (cellCheckable !== false && checkable && checked != null) || (cellCheckable === null && checked != null)) {
            me.addCls(me.checkableCls);
            shouldTri = me.shouldTri();
            if (checked || shouldTri) {
                if (me.getEnableTri() && cellCheckable !== null) {
                    me.bubbleUp(record);
                }
                if (shouldTri && cellCheckable !== null) {
                    me.replaceCls([
                        checkedCls,
                        uncheckedCls
                    ], trimodeCls);
                } else {
                    me.replaceCls([
                        trimodeCls,
                        uncheckedCls
                    ], checkedCls);
                }
            } else {
                if (checked !== null || cellCheckable !== null) {
                    me.replaceCls([
                        checkedCls,
                        trimodeCls
                    ], uncheckedCls);
                }
            }
        } else {
            me.removeCls([
                me.checkableCls,
                checkedCls,
                trimodeCls,
                uncheckedCls
            ]);
        }
    },
    onCheckTap: function(event) {
        var me = this,
            record = me.getRecord(),
            checkField, current, checked;
        if (!record || me.getCheckable() === false || record.get(me.getCheckableField() === false)) {
            return;
        }
        checkField = me.getCheckedField();
        current = record.get(checkField);
        checked = current && current !== true ? this.getCheckOnTriTap() : !current;
        if (me.fireEvent('beforecheckchange', me, checked, current, record) !== false) {
            record.set(checkField, checked);
            if (me.getCheckable() !== null) {
                if (me.getAutoCheckChildren()) {
                    record.cascade(function(child) {
                        if (child !== record) {
                            child.set(checkField, checked);
                        }
                    });
                }
                if (me.getEnableTri()) {
                    me.bubbleUp(record);
                }
            }
            me.fireEvent('checkchange', me, checked, record);
        }
    },
    bubbleUp: function(node) {
        var me = this,
            parent = node.parentNode,
            shouldTri;
        if (!parent) {
            return;
        }
        shouldTri = me.shouldTri(parent, true);
        parent.set('checked', shouldTri ? 'tri' : node.get('checked'));
        me.bubbleUp(parent);
    },
    shouldTri: function(record, forceCheck) {
        var checkedField, checked, childNodes, found;
        record = record || this.getRecord();
        if (!this.getEnableTri() || !record) {
            return false;
        }
        checkedField = this.getCheckedField();
        checked = record.get(checkedField);
        if (checked != null && (!forceCheck || record.isLeaf())) {
            return checked === 'tri';
        }
        childNodes = record.childNodes;
        if (childNodes) {
            return childNodes.some(function(child, idx) {
                checked = child.get(checkedField);
                if (idx && (!!checked !== !!found || (checked && checked !== true))) {
                    return true;
                }
                found = checked;
            });
        }
        return false;
    },
    privates: {
        doNodeUpdate: function(record) {
            var me = this,
                iconClsProperty = me.getIconClsProperty(),
                el = me.element;
            if (iconClsProperty) {
                me.setIconCls(record.data[iconClsProperty]);
            }
            el.toggleCls(me.loadingCls, record.data.loading);
            el.toggleCls(me.leafCls, record.isLeaf());
            me.syncExpandCls();
            me.syncIndent();
            me.syncCheckElement();
        },
        getGrid: function() {
            return this.row.grid;
        },
        syncExpandCls: function() {
            var me, record, expandable, element, expanded, expandedCls, collapsedCls;
            if (!this.updatingExpandCls) {
                me = this;
                record = me.getRecord();
                expandable = record.isExpandable();
                element = me.element;
                expanded = record.isExpanded();
                expandedCls = me.expandedCls;
                collapsedCls = me.collapsedCls;
                me.updatingExpandCls = true;
                element.toggleCls(me.expandableCls, expandable);
                if (expandable) {
                    element.toggleCls(expandedCls, expanded);
                    element.toggleCls(collapsedCls, !expanded);
                } else {
                    element.removeCls([
                        expandedCls,
                        collapsedCls
                    ]);
                }
                me.updatingExpandCls = false;
            }
        },
        syncIndent: function() {
            var me = this,
                column = me.getColumn(),
                indentSize, record, depth, store;
            if (column) {
                indentSize = column._indentSize;
                record = me.getRecord();
                if (!indentSize) {
                    column._indentSize = indentSize = parseInt(me.el.getStyle('background-position'), 10);
                }
                if (record) {
                    store = record.getTreeStore();
                    depth = (store && store.rootVisible) ? record.data.depth : record.data.depth - 1;
                    me.indentElement.dom.style.width = (depth * indentSize) + 'px';
                }
            }
        },
        maybeToggle: function(e) {
            var me = this,
                record = me.getRecord(),
                wasExpanded = record.isExpanded(),
                grid = me.getGrid();
            if (!record.isLeaf() && (!grid.getExpanderOnly() || e.target === me.expanderElement.dom)) {
                me.toggle();
            }
            if (record.isExpanded() !== wasExpanded) {
                e.nodeToggled = true;
                e.stopEvent();
            }
        },
        doToggle: function(row, record, fn) {
            record[fn]();
        }
    }
});

Ext.define('Ext.grid.column.Tree', {
    extend: Ext.grid.column.Column,
    xtype: 'treecolumn',
    config: {
        cell: {
            xtype: 'treecell'
        }
    },
    isTreeColumn: true
});

Ext.define('Ext.grid.plugin.TreeDragDrop', {
    extend: Ext.plugin.dd.DragDrop,
    alias: 'plugin.treedragdrop',
    handle: '.' + Ext.baseCSSPrefix + 'gridrow',
    groups: 'treeDD',
    dropIndicator: Ext.baseCSSPrefix + 'tree-drop-indicator',
    dragText: '{0} selected node{1}',
    expandDelay: 1000,
    allowExpandOnHover: true,
    init: function(view) {
        var me = this;
        view.on('initialize', me.onViewInitialize, me);
    },
    onViewInitialize: function(view) {
        var me = this,
            dragZone = {};
        if (me.enableDrag) {
            if (me.proxy) {
                dragZone.proxy = me.proxy;
            }
            if (me.activateOnLongPress) {
                dragZone.activateOnLongPress = me.activateOnLongPress;
            }
            me.dragZone = new Ext.grid.TreeDragZone(Ext.apply({
                element: view.bodyElement,
                view: view,
                dragText: me.dragText,
                handle: me.handle,
                groups: me.groups,
                scrollAmount: me.scrollAmount,
                containerScroll: me.containerScroll,
                constrain: Ext.getBody()
            }, dragZone));
        }
        if (me.enableDrop) {
            me.dropZone = new Ext.grid.TreeDropZone({
                view: view,
                element: view.bodyElement,
                groups: me.groups,
                dropIndicator: me.dropIndicator,
                overCls: me.overCls,
                copy: me.copy,
                expandDelay: me.expandDelay,
                allowExpandOnHover: me.allowExpandOnHover
            });
        }
    }
});

