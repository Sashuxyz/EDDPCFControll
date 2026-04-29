import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { ChoicePillButtonsRoot } from './components/ChoicePillButtons';
import { buildColorMap } from './utils/colorMap';
import { OptionItem } from './types';

export class ChoicePillButtons
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private pendingOutput = false;
  private currentValue: number | null = null;
  private lastContext!: ComponentFramework.Context<IInputs>;

  public init(
    context: ComponentFramework.Context<IInputs>,
    notifyOutputChanged: () => void,
    _state: ComponentFramework.Dictionary,
    container: HTMLDivElement
  ): void {
    this.root = createRoot(container);
    this.notifyOutputChanged = notifyOutputChanged;
    this.lastContext = context;
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.lastContext = context;

    if (this.pendingOutput) {
      this.pendingOutput = false;
      this.renderReact(context);
      return;
    }

    this.currentValue = context.parameters.value.raw ?? null;
    this.renderReact(context);
  }

  private handleSelect = (newValue: number): void => {
    this.currentValue = newValue;
    this.pendingOutput = true;
    this.notifyOutputChanged();
    this.renderReact(this.lastContext);
  };

  private renderReact(context: ComponentFramework.Context<IInputs>): void {
    const paramAttrs = context.parameters.value.attributes;
    const options: OptionItem[] = (paramAttrs as unknown as { Options?: OptionItem[] })?.Options ?? [];

    const colors: Array<string | undefined> = [
      context.parameters.color1?.raw ?? undefined,
      context.parameters.color2?.raw ?? undefined,
      context.parameters.color3?.raw ?? undefined,
      context.parameters.color4?.raw ?? undefined,
      context.parameters.color5?.raw ?? undefined,
    ];
    const values: Array<number | undefined> = [
      context.parameters.value1?.raw ?? undefined,
      context.parameters.value2?.raw ?? undefined,
      context.parameters.value3?.raw ?? undefined,
      context.parameters.value4?.raw ?? undefined,
      context.parameters.value5?.raw ?? undefined,
    ];

    const colorMap = buildColorMap({ options, colors, values });

    const disabled =
      context.mode.isControlDisabled ||
      (context.parameters.value as unknown as { security?: { editable?: boolean } })
        .security?.editable === false;

    this.root.render(
      React.createElement(ChoicePillButtonsRoot, {
        options,
        selectedValue: this.currentValue,
        colorMap,
        disabled,
        onSelect: this.handleSelect,
      })
    );
  }

  public getOutputs(): IOutputs {
    return { value: this.currentValue ?? undefined } as IOutputs;
  }

  public destroy(): void {
    this.root.unmount();
  }
}
