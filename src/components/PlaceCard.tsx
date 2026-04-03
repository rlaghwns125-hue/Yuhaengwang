import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Linking,
  Platform,
} from 'react-native';
import { Place } from '../types';

interface PlaceCardProps {
  place: Place;
  onClose: () => void;
}

export default function PlaceCard({ place, onClose }: PlaceCardProps) {
  const openInMap = () => {
    const url = Platform.select({
      ios: `nmap://place?lat=${place.latitude}&lng=${place.longitude}&name=${encodeURIComponent(place.name)}&appname=yuhaengwang`,
      android: `nmap://place?lat=${place.latitude}&lng=${place.longitude}&name=${encodeURIComponent(place.name)}&appname=yuhaengwang`,
      default: `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`,
    });
    Linking.openURL(url).catch(() => {
      Linking.openURL(
        `https://map.naver.com/v5/search/${encodeURIComponent(place.name)}`
      );
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{place.name}</Text>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <Text style={styles.closeText}>✕</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.category}>{place.category}</Text>
      <Text style={styles.address}>{place.address}</Text>

      {place.telephone ? (
        <TouchableOpacity
          onPress={() => Linking.openURL(`tel:${place.telephone}`)}
        >
          <Text style={styles.telephone}>{place.telephone}</Text>
        </TouchableOpacity>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.actionBtn} onPress={openInMap}>
          <Text style={styles.actionIcon}>🗺️</Text>
          <Text style={styles.actionText}>네이버 지도</Text>
        </TouchableOpacity>
        {place.telephone ? (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={() => Linking.openURL(`tel:${place.telephone}`)}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionText}>전화</Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#222',
    flex: 1,
  },
  closeBtn: {
    padding: 8,
  },
  closeText: {
    fontSize: 18,
    color: '#999',
  },
  category: {
    fontSize: 13,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 4,
  },
  address: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  telephone: {
    fontSize: 14,
    color: '#4A90D9',
    marginBottom: 12,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  actionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 6,
  },
  actionIcon: {
    fontSize: 16,
  },
  actionText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
});
