import { Permission } from "../types/permission-types";
import { INTERNAL_METHODS_KEY, PERMISSIONS_KEY } from "./consts";

export function Restrict(policy: Permission = "none"): any {
    return (target: any, propertyKey: string) => {
        const storeConstructor = target.constructor;
        if (!storeConstructor.hasOwnProperty(PERMISSIONS_KEY)) {
            storeConstructor[PERMISSIONS_KEY] = {}
        }
        storeConstructor[PERMISSIONS_KEY][propertyKey] = policy
    }
}

export function Internal() {
    return (target: any, propertyKey: string) => {
        const storeConstructor = target.constructor;
        if (!storeConstructor.hasOwnProperty(INTERNAL_METHODS_KEY)) {
            storeConstructor[INTERNAL_METHODS_KEY] = new Set();
        }
        storeConstructor[INTERNAL_METHODS_KEY].add(propertyKey);
    }
}