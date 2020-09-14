import React, { useState, useEffect } from 'react';
import { Map, Marker, Popup, TileLayer, GeoJSON } from 'react-leaflet';
import turf from 'turf';
import keyBy from 'lodash.keyby';

import './styles.css';

const position: [number, number] = [36.714886, -120.221847];

export default function App() {
  const [firePerimeters, setFirePerimters] = useState<any>();
  const [fireMetadata, setFireMetadata] = useState<any>(); // IrwinId => GeoJson Feature

  // https://developers.arcgis.com/rest/services-reference/query-feature-service-layer-.htm
  // https://data-nifc.opendata.arcgis.com/datasets/wildfire-perimeters/data
  useEffect(() => {
    // fetch(
    //   `https://opendata.arcgis.com/datasets/5da472c6d27b4b67970acc7b5044c862_0.geojson?where=${encodeURIComponent(
    //     'geometry={"xmin":21.268,"ymin":24.076,"xmax":111.268,"ymax":65.012,"type":"extent","spatialReference":{"wkid":4326}}',
    //   )}`,
    // )
    const geometry = encodeURIComponent(
      '{"spatialReference":{"wkid":4326},"xmin":-124.409591,"ymin":32.534156,"xmax":-114.131211,"ymax":49.002494}',
    );
    fetch(
      `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Active_Fires/FeatureServer/0/query?geometry=${geometry}&where=1%3D1&outFields=OBJECTID,CalculatedAcres,ContainmentDateTime,ControlDateTime,CreatedOnDateTime,DailyAcres,DiscoveryAcres,FinalFireReportApprovedByTitle,FinalFireReportApprovedByUnit,FinalFireReportApprovedDate,FireBehaviorGeneral,FireBehaviorGeneral1,FireBehaviorGeneral2,FireBehaviorGeneral3,FireCause,FireCauseGeneral,FireCauseSpecific,FireCode,FireDiscoveryDateTime,FireMgmtComplexity,FireOutDateTime,FSJobCode,FSOverrideCode,GACC,IncidentManagementOrganization,IncidentName,IncidentShortDescription,IncidentTypeCategory,IncidentTypeKind,InitialLatitude,InitialLongitude,InitialResponseAcres,InitialResponseDateTime,IrwinID,IsFireCauseInvestigated,IsValid,LocalIncidentIdentifier,ModifiedOnDateTime,PercentContained,TotalIncidentPersonnel,UniqueFireIdentifier,ModifiedBySystem,CreatedOn,ModifiedOn&f=geojson`,
    )
      .then(data => data.json())
      .then(jsonData => {
        const { features } = jsonData;

        const mappedFireMetadata = keyBy(
          features,
          feature => feature.properties.IrwinID,
        );
        setFireMetadata(mappedFireMetadata);
      });

    fetch(
      `https://services3.arcgis.com/T4QMspbfLg3qTGWY/arcgis/rest/services/Public_Wildfire_Perimeters_View/FeatureServer/0/query?f=geojson&geometry=${geometry}&where=${encodeURIComponent(
        "GISAcres >= 100 AND GISAcres <= 503778 AND CreateDate >= TIMESTAMP '2020-09-10 00:00:00'",
      )}&outFields=*`,
    )
      .then(data => data.json())
      .then(jsonData => setFirePerimters(jsonData));
  }, []);

  console.log('fire', firePerimeters, fireMetadata);

  return (
    <div className="leaflet-container">
      <Map center={position} zoom={7}>
        <TileLayer
        // url="http://a.tile.stamen.com/toner/{z}/{x}/{y}.png"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="http://osm.org/copyright">OpenStreetMap</a> contributors'
        />
        {firePerimeters != null && (
          <GeoJSON data={firePerimeters} style={() => ({ color: '#e53e3e' })} />
        )}
        {firePerimeters != null && fireMetadata != null &&
          firePerimeters.features.map((incident: any) => {
            const irwinId: string = incident.properties?.IRWINID?.slice(
              1,
              -1,
            ).toLocaleLowerCase();
            const geoCoordinates = incident.geometry.coordinates;
            const poly =
              incident.geometry.type === 'Polygon'
                ? turf.polygon(geoCoordinates)
                : turf.multiPolygon(geoCoordinates);
            const centroid = turf.centroid(poly);
            console.log({ incident, geoCoordinates, centroid, irwinId });
            const metadata = fireMetadata[irwinId];

            console.log(metadata);

            return (
              <Marker
                position={[
                  centroid.geometry.coordinates[1],
                  centroid.geometry.coordinates[0],
                ]}
              >
                <Popup>
                  Name: {incident.properties.IncidentName}
                  <br />
                  Boundary Updated:{' '}
                  {new Date(incident.properties.CreateDate).toString()}
                  <br />
                  Created by: {incident.properties.UnitID}
                  {' via '}
                  {incident.properties.MapMethod}
                  {metadata != null && (
                    <div>
                      <h3>Additional Incident Information</h3>
                      <div>
                        Last Updated:{' '}
                        {new Date(
                          metadata.properties.ModifiedOnDateTime,
                        ).toString()}
                      </div>
                      <div>Acres: {metadata.properties.DailyAcres}</div>
                      <div>
                        Percent Contained:{' '}
                        {metadata.properties.PercentContained}
                      </div>
                      <div>
                        Personnel: {metadata.properties.TotalIncidentPersonnel}
                      </div>
                    </div>
                  )}
                </Popup>
              </Marker>
            );
          })}
      </Map>
    </div>
  );
}
