import { IInputs, IOutputs } from './generated/ManifestTypes';
import * as React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { RichTextMemoEditor } from './components/RichTextMemo';
import { TokenizerOptions } from './utils/tokenizer';

export class RichTextMemo
  implements ComponentFramework.StandardControl<IInputs, IOutputs>
{
  private root!: Root;
  private notifyOutputChanged!: () => void;
  private pendingOutput = false;
  private currentValue = '';
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
    context.mode.trackContainerResize(true);
  }

  public updateView(context: ComponentFramework.Context<IInputs>): void {
    this.lastContext = context;

    if (this.pendingOutput) {
      this.pendingOutput = false;
      this.renderReact(context);
      return;
    }

    const rawValue = context.parameters.value?.raw ?? '';
    if (rawValue !== this.currentValue) {
      this.currentValue = rawValue;
    }

    this.renderReact(context);
  }

  private renderReact(context: ComponentFramework.Context<IInputs>): void {
    const disabled = context.mode.isControlDisabled;
    const placeholder = context.parameters.placeholder?.raw ?? '';
    const infoText = context.parameters.infoText?.raw ?? '';
    const maxHeight = context.parameters.maxHeight?.raw ?? 400;

    const tokenizerOptions: TokenizerOptions = {
      detectUrls:
        (context.parameters.detectUrls as unknown as { raw?: string | boolean })
          ?.raw !== 'false' &&
        (context.parameters.detectUrls as unknown as { raw?: string | boolean })
          ?.raw !== false,
      detectEmail:
        (context.parameters.detectEmail as unknown as { raw?: string | boolean })
          ?.raw !== 'false' &&
        (context.parameters.detectEmail as unknown as { raw?: string | boolean })
          ?.raw !== false,
    };

    this.root.render(
      React.createElement(RichTextMemoEditor, {
        value: this.currentValue,
        disabled,
        placeholder,
        infoText,
        maxHeight,
        tokenizerOptions,
        onValueChange: (newValue: string) =>
          this.handleValueChange(newValue),
      })
    );
  }

  private handleValueChange(newValue: string): void {
    if (newValue === this.currentValue) return;
    this.currentValue = newValue;
    this.pendingOutput = true;
    this.notifyOutputChanged();
    // Re-render immediately so React gets the updated value prop.
    // Without this, any React state change (e.g. setIsEmpty) triggers
    // a re-render with the stale value prop, which overwrites innerHTML.
    this.renderReact(this.lastContext);
  }

  public getOutputs(): IOutputs {
    return { value: this.currentValue } as IOutputs;
  }

  public destroy(): void {
    this.root.unmount();
  }
}
