export type ComponentType = 'battery' | 'resistor' | 'lamp' | 'switch';

export interface Pin {
  id: string;
  x: number; // Відносні координати піна всередині компонента
  y: number;
}

export interface CircuitElement {
  id: string;
  type: ComponentType;
  x: number;      // Координата X на сітці полотна
  y: number;      // Координата Y на сітці полотна
  rotation: number; // 0, 90, 180, 270 градусів
  pins: Pin[];    // Контакти для підключення дротів
}

export interface Wire {
  id: string;
  fromPin: { elementId: string; pinId: string };
  toPin: { elementId: string; pinId: string };
}