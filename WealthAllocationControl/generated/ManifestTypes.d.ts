/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    totalWealthChf: ComponentFramework.PropertyTypes.NumberProperty;
    cashPct: ComponentFramework.PropertyTypes.DecimalNumberProperty;
    digitalAssetsPct: ComponentFramework.PropertyTypes.DecimalNumberProperty;
    equitiesPct: ComponentFramework.PropertyTypes.DecimalNumberProperty;
    fixedIncomePct: ComponentFramework.PropertyTypes.DecimalNumberProperty;
    commoditiesPct: ComponentFramework.PropertyTypes.DecimalNumberProperty;
    realEstatePct: ComponentFramework.PropertyTypes.DecimalNumberProperty;
    otherPct: ComponentFramework.PropertyTypes.DecimalNumberProperty;
}
export interface IOutputs {
    totalWealthChf?: number;
    cashPct?: number;
    digitalAssetsPct?: number;
    equitiesPct?: number;
    fixedIncomePct?: number;
    commoditiesPct?: number;
    realEstatePct?: number;
    otherPct?: number;
}
