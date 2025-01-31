export interface CurrentFlightData {
    altitude: number;
    bearing: number; 
    id: number;
    layer: string;
    speed: number;
    type: number;
  }

export interface Point {
  type: string;
  coordinates: number[];
}

export interface Airport {
  id: number;
  name: string;
  geometry: Point;
}

export interface Settings {
  [key: string]: any;
}

export interface AircraftType {
  id: number;
  name: string;
  imgId: number;
  settings: Settings | null;
}

export interface Aircraft {
  id: number;
  name: string;
  aircraftTypeId: number;
  aircraftType: AircraftType;
}

export interface Pilot {
  id: number;
  name: string;
  settings: Settings | null;
}

export interface PathFeatureProperties {
  id: number;
  type?: number;
  altitude: number;
  bearing: number;
  speed: number;
  date: string;
}

export interface PathFeature {
  type: string;
  geometry: Point;
  properties: PathFeatureProperties;
}

export interface Path {
  type: string;
  features: PathFeature[];
}

export interface FlightData {
  id: number;
  last_update_date: string;
  status: boolean;
  speed: number;
  altitude: number;
  bearing: number;
  point: Point;
  start_airport: Airport;
  finish_airport: Airport;
  pilot: Pilot;
  aircraft: Aircraft;
  path: Path;
}


export interface TextMessageData {
  type: 'text';
  data: string;
}

export interface CommandMessageData {
  type: 'command';
  data: {
    question: string;
    true_answer: string;
    false_answer: string;
  };
}

export interface LocationMessageData {
  type: 'location';
  data: {
    type: 'target' | 'airport' | 'emergency' | 'searching';
    name : string;
    latitude: number;
    longitude: number;
  };
}

export interface SendMessage {
  user_id: number;
  route_id: number;
  sender: string;
  message: {
    type: 'text' | 'command' | 'location';
    text?: TextMessageData;
    command?: CommandMessageData;
    location?: LocationMessageData;
    timestamp: number;
  };
}
  
  export interface JoinChat {
    socketId: string;
    id: number;
    name: string;
    route_id: number;
  }