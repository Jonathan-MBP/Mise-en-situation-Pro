"""
Script pour corriger les coordonnees geographiques de tous les immeubles.
Tous les immeubles avaient la meme coordonnee (48.8566, 2.3522) = centre de Paris.
Ce script assigne de vraies coordonnees par ville + un jitter aleatoire pour les differencier.
"""
import sqlite3
import random

CITY_COORDS = {
    'Paris 1er Arrondissement': (48.8603, 2.3477),
    'Paris 2e Arrondissement':  (48.8666, 2.3522),
    'Paris 3e Arrondissement':  (48.8637, 2.3608),
    'Paris 4e Arrondissement':  (48.8530, 2.3523),
    'Paris 5e Arrondissement':  (48.8462, 2.3508),
    'Paris 6e Arrondissement':  (48.8496, 2.3337),
    'Paris 7e Arrondissement':  (48.8566, 2.3100),
    'Paris 8e Arrondissement':  (48.8752, 2.3080),
    'Paris 9e Arrondissement':  (48.8762, 2.3390),
    'Paris 10e Arrondissement': (48.8767, 2.3600),
    'Paris 11e Arrondissement': (48.8592, 2.3790),
    'Paris 12e Arrondissement': (48.8399, 2.3886),
    'Paris 13e Arrondissement': (48.8322, 2.3561),
    'Paris 14e Arrondissement': (48.8292, 2.3237),
    'Paris 15e Arrondissement': (48.8418, 2.2918),
    'Paris 16e Arrondissement': (48.8638, 2.2686),
    'Paris 17e Arrondissement': (48.8870, 2.3118),
    'Paris 18e Arrondissement': (48.8922, 2.3444),
    'Paris 19e Arrondissement': (48.8820, 2.3806),
    'Paris 20e Arrondissement': (48.8640, 2.3964),
    'Antony':                   (48.7530, 2.2977),
    'Asnières-sur-Seine':       (48.9175, 2.2852),
    'Asnieres-sur-Seine':       (48.9175, 2.2852),
    'Bagneux':                  (48.7965, 2.3105),
    'Bois-Colombes':            (48.9201, 2.2703),
    'Boulogne-Billancourt':     (48.8352, 2.2400),
    'Bourg-la-Reine':           (48.7786, 2.3158),
    'Chaville':                 (48.8068, 2.1882),
    'Châtenay-Malabry':         (48.7657, 2.2680),
    'Chatenay-Malabry':         (48.7657, 2.2680),
    'Châtillon':                (48.8039, 2.2950),
    'Chatillon':                (48.8039, 2.2950),
    'Clamart':                  (48.8013, 2.2591),
    'Clichy':                   (48.9049, 2.3061),
    'Colombes':                 (48.9239, 2.2507),
    'Courbevoie':               (48.8973, 2.2533),
    'Fontenay-aux-Roses':       (48.7877, 2.2905),
    'Garches':                  (48.8413, 2.1788),
    'Gennevilliers':            (48.9306, 2.2987),
    'Issy-les-Moulineaux':      (48.8238, 2.2702),
    'La Garenne-Colombes':      (48.9083, 2.2428),
    'Le Plessis-Robinson':      (48.7805, 2.2636),
    'Levallois-Perret':         (48.8965, 2.2877),
    'Malakoff':                 (48.8167, 2.3017),
    'Marnes-la-Coquette':       (48.8330, 2.1770),
    'Meudon':                   (48.8130, 2.2363),
    'Montrouge':                (48.8181, 2.3189),
    'Nanterre':                 (48.8913, 2.2069),
    'Neuilly-sur-Seine':        (48.8846, 2.2680),
    'Puteaux':                  (48.8838, 2.2386),
    'Rueil-Malmaison':          (48.8769, 2.1875),
    'Saint-Cloud':              (48.8457, 2.2113),
    'Sceaux':                   (48.7768, 2.2938),
    'Suresnes':                 (48.8693, 2.2272),
    'Sèvres':                   (48.8230, 2.2171),
    'Sevres':                   (48.8230, 2.2171),
    'Vanves':                   (48.8213, 2.2875),
    'Vaucresson':               (48.8371, 2.1586),
    "Ville-d'Avray":            (48.8261, 2.1956),
    'Villeneuve-la-Garenne':    (48.9370, 2.3244),
}

random.seed(42)

conn = sqlite3.connect('immobilier_real.db')
cursor = conn.cursor()

cursor.execute('SELECT building_id, city FROM buildings')
buildings = cursor.fetchall()

updated = 0
not_found = set()

for building_id, city in buildings:
    coords = CITY_COORDS.get(city)

    if coords is None:
        city_clean = (city or '').strip()
        for key, val in CITY_COORDS.items():
            if key.lower() == city_clean.lower():
                coords = val
                break

    if coords:
        lat = coords[0] + random.uniform(-0.003, 0.003)
        lon = coords[1] + random.uniform(-0.004, 0.004)
        cursor.execute(
            'UPDATE buildings SET latitude=?, longitude=? WHERE building_id=?',
            (round(lat, 6), round(lon, 6), building_id)
        )
        updated += 1
    else:
        not_found.add(city)

conn.commit()
conn.close()

print(f'Mis a jour : {updated}/{len(buildings)} immeubles')
if not_found:
    print(f'Villes non trouvees (verifier orthographe) : {not_found}')
else:
    print('Toutes les villes ont ete geolocalises avec succes!')
