import 'package:flutter/material.dart';
import 'package:google_maps_flutter/google_maps_flutter.dart';
import '../services/api.dart';

class MapScreen extends StatefulWidget { const MapScreen({super.key}); @override State<MapScreen> createState()=> _MapScreenState(); }
class _MapScreenState extends State<MapScreen> {
  GoogleMapController? ctrl;
  Set<Marker> markers = {};
  @override void initState(){ super.initState(); load(); }
  Future<void> load() async {
    final posts = await Api.fetchPosts();
    setState(()=> markers = posts.map<Marker>((p){
      final c = p['roadCondition'];
      final hue = c=='Not Passable'? BitmapDescriptor.hueRed : c=='Difficult to Pass'? BitmapDescriptor.hueOrange : c=='Cleared'? BitmapDescriptor.hueGreen : BitmapDescriptor.hueYellow;
      return Marker(markerId: MarkerId(p['id']), position: LatLng((p['lat'] as num).toDouble(), (p['lng'] as num).toDouble()), icon: BitmapDescriptor.defaultMarkerWithHue(hue), infoWindow: InfoWindow(title: p['roadName']??'Report', snippet: '${p['roadCondition']} · ${p['severity']} · ${p['status']}'));
    }).toSet());
  }
  @override Widget build(BuildContext context) {
    return Stack(children: [
      GoogleMapsStub(markers: markers),
      Positioned(top:40, left:12, right:12, child: Card(child: Padding(padding: const EdgeInsets.all(8), child: Text('Map pins color: Red Not Passable · Orange Difficult · Yellow Passable · Green Cleared · Tap pin for detail', style: Theme.of(context).textTheme.labelSmall)))),
      Positioned(bottom:16, right:16, child: FloatingActionButton.small(onPressed: load, child: const Icon(Icons.refresh))),
    ]);
  }
}

class GoogleMapsStub extends StatelessWidget {
  final Set<Marker> markers;
  const GoogleMapsStub({super.key, required this.markers});
  @override Widget build(BuildContext context) {
    return GoogleMap(
      initialCameraPosition: const CameraPosition(target: LatLng(10.706, 122.554), zoom: 14),
      markers: markers,
      onMapCreated: (c){},
      myLocationEnabled: true,
    );
  }
}
