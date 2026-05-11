/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    checkResults: ComponentFramework.PropertyTypes.StringProperty;
    checklistConfig: ComponentFramework.PropertyTypes.StringProperty;
    isReadOnly: ComponentFramework.PropertyTypes.TwoOptionsProperty;
}
export interface IOutputs {
    checkResults?: string;
}
