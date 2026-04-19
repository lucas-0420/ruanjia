export interface Property {
  id: string;
  title: string;
  price: number;
  type: 'apartment' | 'house' | 'studio' | 'room';
  location: {
    city: string;
    district: string;
    address: string;
    lat: number;
    lng: number;
  };
  features: {
    bedrooms: number;
    bathrooms: number;
    area: number;
    floor: number;
    totalFloors?: number;
    managementFee?: number;
    deposit?: string;
  };
  amenities: string[];
  images: string[];
  description: string;
  owner: {
    name: string;
    phone: string;
    avatar: string;
    role?: string;
    lineId?: string;
    uid?: string;
  };
  isZeroFee: boolean;
  createdAt: string;
  tags?: string[];
  status: 'active' | 'archived';
}

export interface LineMessage {
  id: string;
  text: string;
  userId: string;
  timestamp: any;
  status: 'pending' | 'processed' | 'ignored';
  source: string;
  images?: string[];
  parsedData?: Partial<Property>;
}

export type FilterOptions = {
  city?: string;
  priceRange?: [number, number];
  propertyType?: string[];
  bedrooms?: number;
};
