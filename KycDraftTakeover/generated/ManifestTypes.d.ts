/*
*This is auto generated from the ControlManifest.Input.xml file
*/

// Define IInputs and IOutputs Type. They should match with ControlManifest.
export interface IInputs {
    aiAnalyticsAudit: ComponentFramework.PropertyTypes.StringProperty;
    professionalBackground: ComponentFramework.PropertyTypes.StringProperty;
    financialSituation: ComponentFramework.PropertyTypes.StringProperty;
    estimatedTotalWealth: ComponentFramework.PropertyTypes.NumberProperty;
    relatedParties: ComponentFramework.PropertyTypes.StringProperty;
    sanctionCheck: ComponentFramework.PropertyTypes.StringProperty;
    reputationalRisk: ComponentFramework.PropertyTypes.StringProperty;
    pep: ComponentFramework.PropertyTypes.StringProperty;
    sources: ComponentFramework.PropertyTypes.StringProperty;
    aiAnalysisTriggeredOn: ComponentFramework.PropertyTypes.DateTimeProperty;
}
export interface IOutputs {
    aiAnalyticsAudit?: string;
    professionalBackground?: string;
    financialSituation?: string;
    estimatedTotalWealth?: number;
    relatedParties?: string;
    sanctionCheck?: string;
    reputationalRisk?: string;
    pep?: string;
    sources?: string;
    aiAnalysisTriggeredOn?: Date;
}
