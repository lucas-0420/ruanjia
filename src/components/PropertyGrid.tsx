import React from 'react';
import { Property } from '../types';
import PropertyCard from './PropertyCard';
import { motion } from 'motion/react';
import { useFirebase } from '../context/SupabaseContext';

interface PropertyGridProps {
  properties: Property[];
  distanceMap?: Map<string, number>;
}

export default function PropertyGrid({ properties, distanceMap }: PropertyGridProps) {
  const { favorites, toggleFavorite } = useFirebase();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5 lg:gap-8">
      {properties.map((property, index) => (
        <motion.div
          key={property.id}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
        >
          <PropertyCard
            property={property}
            isFavorite={favorites.includes(property.id)}
            onToggleFavorite={toggleFavorite}
            distance={distanceMap?.get(property.id)}
          />
        </motion.div>
      ))}
    </div>
  );
}
