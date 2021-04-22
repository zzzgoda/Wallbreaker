/*
* Author: hluwa <hluwa888@gmail.com>
* HomePage: https://github.com/hluwa
* CreatedTime: 2019/12/4 01:35
* */


import Wrapper = Java.Wrapper;
import Method = Java.Method;
import {hasOwnProperty} from "./utils";
import { prototype } from "events";

export class ClassWrapper {
    private static cache: any = {};
    public static NONE: ClassWrapper = new ClassWrapper(null);
    public name: string;
    public super: string;
    public constructors: Array<any> = [];
    public staticMethods: any = {};
    public instanceMethods: any = {};
    public staticFields: any = {};
    public instanceFields: any = {};
    public implements: Array<string> = [];


    private constructor(handle: Wrapper | null) {
        if (!handle) {
            this.name = "NONE";
            this.super = "NONE";
            return
        }
        this.name = handle.$className;
        this.super = handle.class.getSuperclass().getName();

        // extract methods and fields
        const __this = this;

        if (hasOwnProperty(handle, "$init")) {
            handle.$init.overloads.forEach(function (overload) {
                __this.constructors.push(new MethodWrapper(__this, overload));
            });
        }

        //const pt = hasOwnProperty(handle, "$classWrapper") ? handle.$classWrapper.prototype : handle;
        let pt = null
        // frida12 
        if(hasOwnProperty(handle, "$classWrapper")){
            pt = handle.$classWrapper.prototype
        }
        // frida 14
        else if(hasOwnProperty(handle, "$l")){
            const model = handle.$l;
            model.list().forEach((property: any) => {
                const spec = model.find(property)
                const value = handle[property]
                
                if(spec.startsWith('m')){
                    value.overloads.forEach(function (overload: Method) {
                        const wrapper = new MethodWrapper(__this, overload);
                        if (overload.type == 2) {
                            if (!(__this.staticMethods.hasOwnProperty(property))) {
                                __this.staticMethods[property] = [];
                            }
                            __this.staticMethods[property].push(wrapper);
                        } else if (overload.type == 1) {
                            // pass
                        } else {
                            if (property == '$init') {
                                // pass
                            } else {
                                if (!(__this.instanceMethods.hasOwnProperty(property))) {
                                    __this.instanceMethods[property] = [];
                                }
                                __this.instanceMethods[property].push(wrapper);
                            }
                        }
                    });
                }else{
                    if (value.fieldType == 1) {
                        __this.staticFields[property] = value;
                        __this.staticFields[property].toJSON = function () {
                            return {
                                name: property,
                                isStatic: this.fieldType == 1,
                                type: this.fieldReturnType.className
                            }
                        }
                    } else {
                        __this.instanceFields[property] = value;
                        __this.instanceFields[property].toJSON = function () {
                            return {
                                name: property,
                                isStatic: this.fieldType == 1,
                                type: this.fieldReturnType.className
                            }
                        }
                    }
                }
                
            });

        }else{
            pt = handle
        }
        if(pt !== null){
            Object.getOwnPropertyNames(pt).forEach(function (property) {
                const value = handle[property];
                
               
                if (hasOwnProperty(value, "argumentTypes")) {
                    value.overloads.forEach(function (overload: Method) {
                        const wrapper = new MethodWrapper(__this, overload);
                        if (overload.type == 2) {
                            if (!(__this.staticMethods.hasOwnProperty(property))) {
                                __this.staticMethods[property] = [];
                            }
                            __this.staticMethods[property].push(wrapper);
                        } else if (overload.type == 1) {
                            // pass
                        } else {
                            if (property == '$init') {
                                // pass
                            } else {
                                if (!(__this.instanceMethods.hasOwnProperty(property))) {
                                    __this.instanceMethods[property] = [];
                                }
                                __this.instanceMethods[property].push(wrapper);
                            }
                        }
                    });
                } else if (hasOwnProperty(value, "fieldReturnType")) {
                    if (value.fieldType == 1) {
                        __this.staticFields[property] = value;
                        __this.staticFields[property].toJSON = function () {
                            return {
                                name: property,
                                isStatic: this.fieldType == 1,
                                type: this.fieldReturnType.className
                            }
                        }
                    } else {
                        __this.instanceFields[property] = value;
                        __this.instanceFields[property].toJSON = function () {
                            return {
                                name: property,
                                isStatic: this.fieldType == 1,
                                type: this.fieldReturnType.className
                            }
                        }
                    }
                }
            });    
        }
        
        // get implemented interfaces
        const _this = this;
        handle.class.getInterfaces().forEach(function (interfaceClass: Wrapper) {
            _this.implements.push(interfaceClass.getName());
        });
    }

    public static byWrapper(handle: Wrapper) {
        const name = handle.class.getName();
        if (!(name in ClassWrapper.cache)) {
            ClassWrapper.cache[name] = new ClassWrapper(handle);
        }
        return ClassWrapper.cache[name];
    }
}


export class MethodWrapper {
    public name: string;
    public arguments: Array<any> = [];
    public retType: any;
    public isStatic: Boolean;
    public isConstructor: Boolean;
    public ownClass: string;

    constructor(own: ClassWrapper, overload: Method) {
        const _this = this;
        this.ownClass = own.name;
        this.name = overload.methodName;
        overload.argumentTypes.forEach(function (t) {
            _this.arguments.push(t.className);
        });
        this.retType = overload.returnType.className;
        this.isStatic = overload.type == 2;
        this.isConstructor = overload.type == 1;
    }
}