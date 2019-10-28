export function extnameToProperty(event, me) {
    for (var prop in event.detail.cmpObj) {
        me[prop+'Cmp'] = event.detail.cmpObj[prop];
    }
}

export function doProp(me, prop) {
    Object.defineProperty(me, prop, {
        get: function(){return doGet(me,prop)},
        set: function(val){doSet(me,prop,val)}
    });
}
function doSet(me,prop,val) {
    if (val) {
        var val2;
        //console.log(prop)
        // if (prop == 'renderer') {
        //     //console.log(typeof val)
        // }
        if (typeof val == 'object' || typeof val == 'function') {
            // if (me.attributeObjects == undefined) {
            //     me.attributeObjects = {}
            // }
            me.attributeObjects[prop] = val
            val2 = typeof val
        }
        // else {
        //     try {
        //         val2 = JSON.stringify(val)
        //     }
        //     catch (e) {
        //         if (me.attributeObjects == undefined) {
        //             me.attributeObjects = {}
        //         }
        //         me.attributeObjects[prop] = val
        //         val2 = 'error'
        //     }
        // }
        else {
            val2 = val
        }
        // if (prop == 'id') {
        //     console.log('set: ' + val2)
        // }
        me.setAttribute(prop, val2)
    }
    else {
        me.removeAttribute(prop)
    }
}
function doGet(me,prop) {
    //console.log('doGet: ' + prop)
    // if (prop == 'id') {
    //     console.log(me.getAttribute(prop))
    //     console.log(me.attributeObjects[prop])
    // }
    if (me.getAttribute(prop) == 'object' || me.getAttribute(prop) == 'function') {
        //console.log('a')
        return me.attributeObjects[prop]
    }
    else if (me.getAttribute(prop) != null) {
        //console.log('b')
        return me.getAttribute(prop)
    }
    else {
        // if (prop != 'id') {
        //     console.log('no return from doGet for ' + prop + ' in ' + me.tagName)
        // }
        return null
    }
}

export function filterProp(propertyValue, property, me) {
    try {
         if (propertyValue == 'error') {
             //console.log(property)
             return me.attributeObjects[property]
         }
        const parsedProp = JSON.parse(propertyValue);

        if (parsedProp === null ||
            parsedProp === undefined ||
            parsedProp === true ||
            parsedProp === false ||
            parsedProp === Object(parsedProp) ||
            (!isNaN(parsedProp) && parsedProp !== 0)
        ) {
            return parsedProp;
        } else {
            return propertyValue;
        }
    }
    catch(e) {
        return propertyValue;
    }
}

export function isMenu(childxtype) {
    if (childxtype === 'menu') {
        return true
    }
    else {
        return false
    }
}

export function isRenderercell(childxtype) {
    if (childxtype === 'renderercell') {
        return true
    }
    else {
        return false
    }
}

export function isParentGridAndChildColumn(parentxtype,childxtype) {
    if (parentxtype === 'grid' && childxtype.includes("column")) {
        return true
    }
    else {
        return false
    }
}

export function isTooltip(childxtype) {
    if (childxtype === 'tooltip') {
        return true
    }
    else {
        return false
    }
}

export function isPlugin(childxtype) {
    if (childxtype === 'plugin') {
        return true
    }
    else {
        return false
    }
}
