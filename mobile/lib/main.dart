import 'package:flutter/material.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'screens/feed_screen.dart';
import 'screens/map_screen.dart';
import 'screens/capture_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await Hive.initFlutter();
  await Hive.openBox('queue');
  runApp(const BahawatchApp());
}

class BahawatchApp extends StatefulWidget {
  const BahawatchApp({super.key});
  @override State<BahawatchApp> createState() => _BahawatchAppState();
}

class _BahawatchAppState extends State<BahawatchApp> {
  int idx = 0;
  final screens = const [FeedScreen(), MapScreen(), CaptureScreen()];
  @override Widget build(BuildContext context) {
    return MaterialApp(
      title: 'BAHAWATCH',
      theme: ThemeData(useMaterial3: true, colorSchemeSeed: Colors.blue),
      home: Scaffold(
        body: screens[idx],
        bottomNavigationBar: NavigationBar(
          selectedIndex: idx,
          onDestinationSelected: (i) => setState(() => idx = i),
          destinations: const [
            NavigationDestination(icon: Icon(Icons.feed), label: 'Feed'),
            NavigationDestination(icon: Icon(Icons.map), label: 'Map'),
            NavigationDestination(icon: Icon(Icons.camera_alt), label: 'Post'),
          ],
        ),
      ),
    );
  }
}
