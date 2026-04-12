/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    frequency: ComponentFramework.PropertyTypes.OptionSetProperty;
    startType: ComponentFramework.PropertyTypes.OptionSetProperty;
    relativeDays: ComponentFramework.PropertyTypes.WholeNumberProperty;
    recurrenceInterval: ComponentFramework.PropertyTypes.WholeNumberProperty;
    leadTime: ComponentFramework.PropertyTypes.WholeNumberProperty;
    dueDate: ComponentFramework.PropertyTypes.DateTimeProperty;
    anchorDate: ComponentFramework.PropertyTypes.DateTimeProperty;
    statusCode: ComponentFramework.PropertyTypes.OptionSetProperty;
}
export interface IOutputs {
    frequency?: number;
    startType?: number;
    relativeDays?: number;
    recurrenceInterval?: number;
    leadTime?: number;
    dueDate?: Date;
    anchorDate?: Date;
    statusCode?: number;
}
