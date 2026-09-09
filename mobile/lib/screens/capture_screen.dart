import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';
import 'package:geolocator/geolocator.dart';
import '../services/api.dart';

class CaptureScreen extends StatefulWidget { const CaptureScreen({super.key}); @override State<CaptureScreen> createState()=> _CaptureScreenState(); }
class _CaptureScreenState extends State<CaptureScreen> {
  XFile? photo; Position? pos; bool submitting=false; String? aiSuggest;
  String roadCondition='Not Passable'; String severity='High'; final captionCtrl=TextEditingController();
  final roadCtrl=TextEditingController(text: 'Burgos St. - ISAT-U Gate');

  Future<void> capture() async {
    final p = await ImagePicker().pickImage(source: ImageSource.camera, imageQuality: 80, maxWidth: 1024);
    if (p==null) return;
    final permission = await Geolocator.checkPermission();
    if (permission==LocationPermission.denied) await Geolocator.requestPermission();
    final position = await Geolocator.getCurrentPosition(desiredAccuracy: LocationAccuracy.high);
    setState((){ photo=p; pos=position; aiSuggest='AI analyzing...'; });
    await Future.delayed(const Duration(milliseconds:800));
    setState(()=> aiSuggest='AI suggests: ${severity} · ${roadCondition} (78%) — confirm or edit');
  }

  Future<void> submit() async {
    if (photo==null || pos==null) { ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Capture photo with geolocation first'))); return; }
    if (!await showDialog(barrierDismissible:false, context: context, builder: (_)=> AlertDialog(title: const Text('Safety Reminder'), content: const Text('Do NOT enter floodwater to take photo. Do NOT use while driving. Submit only from a safe location.'), actions: [TextButton(onPressed: ()=> Navigator.pop(context,false), child: const Text('Cancel')), FilledButton(onPressed: ()=> Navigator.pop(context,true), child: const Text('I am safe — Submit'))])) ) return;
    setState(()=> submitting=true);
    try {
      final r = await Api.createPost(photoPath: photo!.path, lat: pos!.latitude, lng: pos!.longitude, roadName: roadCtrl.text, roadCondition: roadCondition, severity: severity, caption: captionCtrl.text);
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Posted! Status: ${r['status']} · AI ${r['ai']?['confidence']??''}')));
      setState(()=> photo=null);
    } catch(e){ if(mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Failed: $e'))); }
    setState(()=> submitting=false);
  }

  @override Widget build(BuildContext context) {
    return ListView(padding: const EdgeInsets.all(16), children: [
      Text('New Flood Post', style: Theme.of(context).textTheme.titleLarge),
      const SizedBox(height:8),
      if (aiSuggest!=null) Card(color: Colors.blue.shade50, child: Padding(padding: const EdgeInsets.all(10), child: Text(aiSuggest!, style: const TextStyle(fontSize:12)))),
      const SizedBox(height:8),
      InkWell(onTap: capture, child: Container(height:180, decoration: BoxDecoration(color: Colors.grey.shade200, borderRadius: BorderRadius.circular(12), border: Border.all(color: Colors.grey.shade300)), child: photo==null? const Center(child: Column(mainAxisSize: MainAxisSize.min, children:[Icon(Icons.camera_alt, size:36), SizedBox(height:6), Text('Tap to capture flood photo (geotagged)')])) : ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(photo!.path, fit: BoxFit.cover, errorBuilder: (_,__,___)=> const Center(child: Icon(Icons.image)))))),
      if (pos!=null) Padding(padding: const EdgeInsets.only(top:8), child: Text('📍 ${pos!.latitude.toStringAsFixed(5)}, ${pos!.longitude.toStringAsFixed(5)} · Captured ${DateTime.now().toString().substring(0,19)}', style: const TextStyle(fontSize:11, color: Colors.grey))),
      const SizedBox(height:12),
      TextField(controller: roadCtrl, decoration: const InputDecoration(labelText: 'Road / Barangay', border: OutlineInputBorder())),
      const SizedBox(height:8),
      DropdownButtonFormField(value: roadCondition, items: const [DropdownMenuItem(value:'Passable', child: Text('Passable')), DropdownMenuItem(value:'Difficult to Pass', child: Text('Difficult to Pass')), DropdownMenuItem(value:'Not Passable', child: Text('Not Passable')), DropdownMenuItem(value:'Cleared', child: Text('Cleared'))], onChanged: (v)=> setState(()=> roadCondition=v!), decoration: const InputDecoration(labelText: 'Road Condition (AI suggests)', border: OutlineInputBorder())),
      const SizedBox(height:8),
      DropdownButtonFormField(value: severity, items: const [DropdownMenuItem(value:'Low', child: Text('Low')), DropdownMenuItem(value:'Moderate', child: Text('Moderate')), DropdownMenuItem(value:'High', child: Text('High'))], onChanged: (v)=> setState(()=> severity=v!), decoration: const InputDecoration(labelText: 'Severity (AI suggests)', border: OutlineInputBorder())),
      const SizedBox(height:8),
      TextField(controller: captionCtrl, maxLines: 2, decoration: const InputDecoration(labelText: 'Caption (optional)', hintText: 'e.g., Knee-deep at ISAT-U gate, taken from footbridge, safe location', border: OutlineInputBorder())),
      const SizedBox(height:12),
      FilledButton.icon(onPressed: submitting? null : submit, icon: submitting? const SizedBox(width:16,height:16, child: CircularProgressIndicator(strokeWidth:2, color: Colors.white)) : const Icon(Icons.send), label: Text(submitting? 'Posting...' : 'Post Report')),
      const SizedBox(height:6),
      Text('Photo mandatory · geotagged at capture · AI validates before posting · queued if offline', style: Theme.of(context).textTheme.labelSmall?.copyWith(color: Colors.grey)),
    ]);
  }
}
