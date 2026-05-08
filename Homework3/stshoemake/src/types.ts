export interface Margin {
    readonly left: number;
    readonly right: number;
    readonly top: number;
    readonly bottom: number;
}

export interface ComponentSize {
    width: number;
    height: number;
}

export interface Point {
    readonly posX: number;
    readonly posY: number;
}

export interface Bar {
    readonly value: number;
}

// Added by Steven
export interface TickerPoint {
  date: Date;
  open: number;
  high: number;
  low: number;
  close: number;
}